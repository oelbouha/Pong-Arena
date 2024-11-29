from rest_framework import serializers
from users.models import User
from rest_framework.validators import UniqueValidator
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate

import sys


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField( required=True, validators=[UniqueValidator(queryset=User.objects.all())] )
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'first_name', 'last_name')
        extra_kwargs = {
            'username': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True}
        }


    def create(self, validated_data):
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name']
        )
        
        user.set_password(validated_data['password'])
        user.save()

        return user

   
class SocialRegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True, validators=[UniqueValidator(queryset=User.objects.all())] )
    username = serializers.CharField(
        required=True,
        validators=[UniqueValidator(queryset=User.objects.all())],
        error_messages={ 'unique': 'a user with that username already exists' }
    )
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password])

    class Meta:
        model = User
        fields = ('username', 'password', 'email', 'first_name', 'last_name')
        error_messages = {"username": {"unique": "A user with that username already exists"}}
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True}
        }


    def create(self, validated_data):
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            verified=True
        )
        
        if 'password' in validated_data:
            user.set_password(validated_data['password'])
        user.save()

        return user
    
    
class LoginSerializer(serializers.Serializer):
    login = serializers.CharField(write_only=True, required=True)
    password = serializers.CharField(write_only=True, required=True)
        
    def authenticate(self):
        email_creds = {
            'email': self.validated_data['login'],
            'password': self.validated_data['password']
        }
        username_creds = {
            'username': self.validated_data['login'],
            'password': self.validated_data['password']
        }
        user = self.custom_login('username', username_creds) or  self.custom_login('email', email_creds)
        
        if user:
            return True, user
        return False, None

    def custom_login(self, id_field, creds):
        User.USERNAME_FIELD = id_field
        return authenticate(**creds)