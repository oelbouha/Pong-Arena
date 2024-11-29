from django.http import HttpRequest, HttpResponseNotFound, JsonResponse
from django.views import View
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.models import User


from main.forms import LoginForm
from pathlib import Path


class Home(LoginRequiredMixin, View):
    def get(self, request: HttpRequest):
        return render(request, 'home.html')


class Login(View):
    def get(self, request: HttpRequest):
        form = LoginForm()
        return render(request, 'login.html', {
            'form': form
        })
    

    def post(self, request: HttpRequest):
        form = LoginForm(request.POST)
        next = '/' if not 'next' in request.GET else request.GET['next']
        if form.is_valid():
            user = authenticate(request, username=form.cleaned_data['username'], password=form.cleaned_data['password'])
            if user is None:
                return render(request, 'login.html', {
                    'form': LoginForm(),
                    'message': 'wrong username/password'
                })
            login(request, user)
            return redirect(next)

        return render(request, 'login.html', {
            'form': LoginForm(),
            'message': 'invalid username/password'
        })





class Logout(LoginRequiredMixin, View):
    def post(self, request: HttpRequest):
        logout(request)
        return redirect('/login/')
    


class UserData(LoginRequiredMixin, View):

    def get(self, request: HttpRequest, **kwargs):
        id = kwargs['id']
        try:
            user = User.objects.get(id=id)
        except User.DoesNotExist:
            return HttpResponseNotFound("user not found")


        return JsonResponse({
            'username': user.username
        })
    