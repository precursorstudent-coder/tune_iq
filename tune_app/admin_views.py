from django.shortcuts import render,redirect
from .models import PortalAdmin 
from django.contrib import messages
from django.conf import settings
import os
import pandas as pd
import plotly.express as px

df=None ## global variable DATAFRAME

def admin_login(request):
    if request.method=="GET":
     return render(request,'tune_app/admin/admin_login.html')
    if request.method=="POST":
       admin_email=request.POST["email"]
       admin_pass=request.POST["password"]
       admin_list=PortalAdmin.objects.filter(email=admin_email,password=admin_pass) 
       if len(admin_list)>0:
          request.session["admin_key"]=admin_email
          return redirect("admin_home")
       else:
          messages.error(request,"Invalid Credentials")
          return redirect("admin_login")
          

def admin_profile(request):
    a_email=request.session.get("admin_key")  
    admin_object=PortalAdmin.objects.get(email=a_email) 
    context={
        "admin_info":admin_object 
    }
    return render(request,'tune_app/admin/admin_profile.html',context) 


def admin_logout(request):
    request.session.pop("admin_key",None) 
    messages.success(request,"Logout Successfully")
    return redirect("admin_login")



def admin_home(request):
    pie_chart, bar_chart,line_chart = get_dashboard_charts()
    context={
             "pie_chart":pie_chart,
             "bar_chart":bar_chart,
             "line_chart":line_chart
            }
    return render(request,'tune_app/admin/admin_home.html',context)

def model_training(request):
    return render(request,'tune_app/admin/model_training.html')



######## ML Code ######

def get_dashboard_charts():
   global df # to identify that it is global
   csv_path=os.path.join(
      settings.BASE_DIR,
      "tune_app",
      "dataset",
      "songs.csv"
   )
   df=pd.read_csv(csv_path)
   genre_count = df["language"].value_counts()

   bar_fig = px.bar(
        x=genre_count.index,
        y=genre_count.values,
        title="Language Distribution",
        labels={
            "x": "language",
            "y": "playCount"
        }
    )

   bar_chart = bar_fig.to_html(full_html=False)

    # =====================
    # Author Distribution
    # =====================

   singer_count = (
        df["singer"]
          .value_counts()
          .head(10)
    )

   pie_fig = px.pie(
        values=singer_count.values,
        names=singer_count.index,
        title="Top 10 singer Distribution"
    )

   pie_chart = pie_fig.to_html(full_html=False)

   year_count = df["year"].value_counts().sort_index()
   line_fig=px.line(  
      x=year_count.index,
      y=year_count.values,
      title="Year Distribution",

        labels={
            "x": "year",
            "y": "album" 
        }
   )
   line_chart = line_fig.to_html(full_html=False)
    

   return bar_chart, pie_chart,line_chart