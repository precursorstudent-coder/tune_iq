from django.shortcuts import render,redirect
from .models import Contact
from django.contrib import messages

# Create your views here.
def home(request):
    return render(request,'tune_app/html/index.html')
def about_us(request):
    return render(request,'tune_app/html/about_us.html')


def contact_us(request):
    if request.method=="GET":
     return render(request,'tune_app/html/contact_us.html')
    if request.method=="POST":
       nm=request.POST["name"]
       em=request.POST["email"]
       ph=request.POST["phone"]
       qy=request.POST["query"]
       obj=Contact(name=nm,email=em,phone=ph,query=qy)
       obj.save()
       messages.success(request,"Message Sent Successfully!")
       return redirect("contact_us")

def faq(request):
    return render(request,'tune_app/html/faq.html')

