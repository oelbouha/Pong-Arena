from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from shared_models.models import SharedUser

class User(SharedUser):
    class Meta:
        abstract = False
        managed = True
          
    def get_2fa_devices(self):
        email_device = self.emaildevice_set.first()
        totp_device = self.totpdevice_set.first()
        static_device = self.staticdevice_set.first()
        
        return {
            'totp': totp_device,
            'email': email_device,
            'static': static_device
        }
        

    def get_active_2fa(self):
        email_device = self.emaildevice_set.filter(confirmed=True).exists()
        totp_device = self.totpdevice_set.filter(confirmed=True).exists()
        static_device = self.staticdevice_set.filter(confirmed=True).exists()
        
        return {
            'totp': totp_device,
            'email': email_device,
            'static': static_device
        }
    