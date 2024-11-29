import time
import json
import mimetypes
import ffmpeg

from django.http import HttpRequest, JsonResponse, HttpResponse, HttpResponseBadRequest, FileResponse
from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Q
from django.core.files.storage import default_storage
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import TemporaryUploadedFile

from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator


from main.models import Message, TypeChoices

from PIL import Image
from pypdf import PdfReader
from pypdf.errors import PyPdfError
from tempfile import NamedTemporaryFile
from pathlib import Path


# TODO don't forget to test >1M files

@method_decorator(csrf_exempt, name="dispatch")
class UploadFile(LoginRequiredMixin, View):

    def get(self, request: HttpRequest):
        return HttpResponse("upload file")


    def post(self, request: HttpRequest):
        print(request.FILES)
        try:
            to = request.POST['to']
            f = request.FILES['file']
            prev_f = request.FILES['preview']
        except KeyError:
            raise ValidationError("file not found")
        
        try:
            files_paths = self.file_validation(request.FILES)
            prefix = f'{request.user.id}_{to}/'
            file = default_storage.save(prefix + files_paths['f'], f)
            preview_file = default_storage.save(prefix + files_paths['prev_f'], prev_f)
            return JsonResponse({'f': file, 'prev_f': preview_file})
        except ValidationError as e:
            print(e.message)
            return JsonResponse({
                "error": e.message
            }, status=400)



    def file_validation(self, files):

        image_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        video_types = ['video/mp4']
        audio_types = ['audio/mpeg']
        pdf_type = 'application/pdf'

        try:
            file_type = mimetypes.guess_type(files['file'].name)[0]
        except KeyError:
            raise ValidationError("file not found")
        
        if file_type in image_types:
            return self.image_validation(files)
        elif file_type in video_types:
            return self.video_validation(files)
        elif file_type in audio_types:
            return self.audio_validation(files)
        elif file_type == pdf_type:
            return self.pdf_validation(files)
        else:
            raise ValidationError("file type not supported")
        

    def image_validation(self, files):
        try:
            f = files['file']
            prev_f = files['preview']
        except KeyError:
            raise ValidationError("file not found")
        
        if f.size > settings.IMG_SIZE:
            raise ValidationError(f"image too large (max size: {settings.IMG_SIZE / 1_000_000} MB)")
        
        if prev_f.size > settings.IMG_PREV_SIZE:
            raise ValidationError(f"preview image too large (max size: {settings.IMG_PREV_SIZE / 1_000_000} MB)")
        
        try:
            with Image.open(f) as img, Image.open(prev_f) as prev_img:
                img.verify()
                prev_img.verify()
                path = time.strftime("%Y/%m/%d/")
                
                img_path = path + f.name
                prev_img_path = path + prev_f.name
                # img_path = default_storage.save(path + f.name, f)
                # prev_img_path = default_storage.save(path + prev_f.name, prev_f)
        except Exception:
            raise ValidationError("invalid image")
        
        return {
            'f': img_path,
            'prev_f': prev_img_path
        }
        

    def video_validation(self, files):
        f = files['file']
        try:
            prev_f = files['preview']
        except KeyError:
            raise ValidationError("preview file not found")
        
        if f.size > settings.VIDEO_SIZE:
            raise ValidationError(f"video too large (max size: {settings.VIDEO_SIZE / 1_000_000} MB)")
        
        if prev_f.size > settings.VIDEO_PREV_SIZE:
            raise ValidationError(f"video thumbnail too large (max size: {settings.VIDEO_PREV_SIZE / 1_000_000} MB)")
        
        video_path = ''
        if isinstance(f, TemporaryUploadedFile):
            video_path = f.temporary_file_path()
            self.check_video_is_valid(video_path)
        else:
            with NamedTemporaryFile(suffix=Path(f.name).suffix) as temp_file:
                for chunk in f.chunks():
                    temp_file.write(chunk)
                temp_file.flush()
            self.check_video_is_valid(temp_file.name)


        try:
            with Image.open(prev_f) as thumbnail:
                thumbnail.verify()
                path = time.strftime("%Y/%m/%d/")
                video_path = path + f.name
                thumbnail_path = path + prev_f.name
                # video_path = default_storage.save(path + f.name, f)
                # thumbnail_path = default_storage.save(path + prev_f.name, prev_f)
        except Exception:
            raise ValidationError("invalid thumbnail")
        
        return {
            'f': video_path,
            'prev_f': thumbnail_path
        }


    def check_video_is_valid(self, video_path):
        try:
            ffmpeg.probe(video_path)
        except ffmpeg.Error:
            raise ValidationError("invalid video")


    def audio_validation(self, files):
        f = files['file']

        # try:
        #     sf = soundfile.read(f)
        # except soundfile.SoundFileError:
        #     return None, "invalid audio"
        
        path = time.strftime("%Y/%m/%d/")
        audio_path = default_storage.save(path + f.name, f)

        return {
            'f': audio_path
        }


    def pdf_validation(self, files):
        f = files['file']

        if f.size > settings.PDF_SIZE:
            raise ValidationError(f"file too large (max size: f{settings.PDF_SIZE / 1_000_000} MB)")
        
        try:
            pdf = PdfReader(f)
        except PyPdfError:
            raise ValidationError("invalid pdf")
        
        path = time.strftime("%Y/%m/%d/")
        pdf_path = default_storage.save(path + f.name, f)

        return {
            'f': pdf_path
        }
        

class PreviewFile(LoginRequiredMixin, View):

    def get(self, request: HttpRequest, **kwargs):
        try:
            id = kwargs['id']
            message = Message.objects.get(
                Q(id=id),
                Q(sender=request.user) | Q(recipient=request.user),
                ~Q(type=TypeChoices.TEXT)
            )
            content_dict = json.loads(message.content)

            if not 'prev_f' in content_dict:
                return JsonResponse({
                    "error": "the message doesn't have a preview file"
                }, status=400)
            
            return FileResponse(
                default_storage.open(content_dict['prev_f'])
            )

        except Message.DoesNotExist:
            return JsonResponse({
                'error': 'message not found'
            }, status=404)

        except json.JSONDecodeError:
            return JsonResponse({
                'error': 'message content is not json'
            }, status=400)




class FullFile(LoginRequiredMixin, View):

    def get(self, request: HttpRequest, **kwargs):
        try:
            id = kwargs['id']
            message = Message.objects.get(
                Q(id=id),
                Q(sender=request.user) | Q(recipient=request.user),
                ~Q(type=TypeChoices.TEXT)

            )
            content_dict = json.loads(message.content)

            return FileResponse(
                default_storage.open(content_dict['f'])
            )
        except Message.DoesNotExist:
            return JsonResponse({
                'error': 'you are Unauthorized to access this file'
            }, status=404)

        except json.JSONDecodeError:
            return JsonResponse({
                'error': 'message content is not a json'
            }, status=400)
        
    

# TODO check the message type before returning the file url in preview and full views (there is a possibility the send json content in a text message)