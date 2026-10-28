from django.db import models
from django.utils import timezone
# Create your models here.

class PortalAdmin(models.Model):
    email=models.EmailField(max_length=45,primary_key=True)
    password=models.CharField(max_length=45)
    name=models.CharField(max_length=45)
    phone=models.CharField(max_length=15)

    def _str_(self):
       return self.name
    
## Contact Model ##
class Contact(models.Model):
    name=models.CharField(max_length=50)
    email=models.EmailField(max_length=45)
    phone=models.CharField(max_length=13)
    query=models.TextField()
    date=models.DateField(default=timezone.now)

## FeedBack Model##
class Feedback(models.Model):
    name=models.CharField(max_length=45)
    email=models.EmailField(max_length=45)
    rating=models.CharField(max_length=5)
    review=models.TextField()
    date=models.DateField(default=timezone.now)  

## UserDetails Model##
class UserDetail(models.Model):
     email=models.EmailField(max_length=45,primary_key=True)
     password=models.CharField(max_length=45)
     username=models.CharField(max_length=45)
     date=models.DateField(default=timezone.now) 


    

    
