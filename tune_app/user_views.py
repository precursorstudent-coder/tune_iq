import csv
from django.http import Http404
from django.shortcuts import render,redirect
from .models import UserDetail,Feedback
from django.contrib import messages 
from django.conf import settings 
import os
import pandas as pd
import plotly.express as px
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.neighbors import NearestNeighbors

df=None ## global variable DATAFRAME

def login(request):
    if request.method=="GET":
     return render(request,'tune_app/user/login.html')
    if request.method=="POST":
        user_email=request.POST["email"]
        user_pass=request.POST["password"]
        user_list=UserDetail.objects.filter(email=user_email,password=user_pass) 
    if len(user_list)>0:
        ## using django session to identify each request of the user ##
        request.session["user_key"]=user_email 
        return redirect("user_home")
    else:
        messages.error(request,"Invalid Credentials")
        return redirect("user_login_page")

def registration(request):
    if request.method=="GET":
       return render(request,'tune_app/user/registration.html')
    if request.method=="POST":
    # fetching values from html elements
     em=request.POST["email"]
     nm=request.POST["username"]
     ps=request.POST["password"]
     ## ORM framework ##
     user_obj=UserDetail(email=em,password=ps,username=nm)
     user_obj.save()
     messages.success(request,"You're In!")
     return redirect("user_login_page")
    


def feedback(request):
    if request.method=="GET":
     return render(request,'tune_app/user/feedback.html')
    if request.method=="POST":
       nm=request.POST["name"]
       em=request.POST["email"]
       rt=request.POST["rating"]
       re=request.POST["reviews"]
       user_obj=Feedback(name=nm,email=em,rating=rt,review=re)
       user_obj.save()
       messages.success(request,"Thanks for the Rating!")
       return redirect("feedback") 

def user_home(request):
    pie_chart, bar_chart,line_chart = get_dashboard_charts()
    context={
                 "pie_chart":pie_chart,
                 "bar_chart":bar_chart,
                 "line_chart":line_chart
                }
    return render(request,'tune_app/user/user_home.html',context)



def user_profile(request):
    ## fetching values from session to identify individual user ##
    u_email=request.session["user_key"]
    ## finding UserDetail object on the basis of email ## 
    user_object=UserDetail.objects.get(email=u_email) 
    ## sending data from view to template ,,, w'll create dictionary and bind the object,,, then send it with render function ##
    context={
       "user_info":user_object 
    }
    return render(request,'tune_app/user/user_profile.html',context) 
 
################ EDIT PROFILE############
def user_edit_profile(request):
    if request.method=="GET":
      email=request.session["user_key"]  
      user_object=UserDetail.objects.get(email=email) 
      context={
           "user_info":user_object 
        }
      return render(request,'tune_app/user/user_edit_profile.html',context) 
############# XXXXXXXXX ###############

def user_logout(request):
    del request.session["user_key"]
    messages.success(request,"Logout Successfully")
    return redirect("user_login_page")



###Song List View Function###

from pathlib import Path
def song_list(request):
    #csv_path = Path(settings.BASE_DIR) / "ml_app" / "static" / "ml_app" / "csv" / "songs.csv"
   

    csv_path = Path(
    settings.BASE_DIR,
    "tune_app",
    "dataset",
    "songs.csv" ) 

    
    songs = []
    search_query = request.GET.get("q", "").strip()
    search_type = request.GET.get("search_type", "name")
    normalized_query = search_query.lower()

    try:
        with csv_path.open(newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for idx, row in enumerate(reader):
                song_name = row.get("song_name", "")
                singer_name = row.get("singer", "")
                if normalized_query:
                    if search_type == "singer":
                        if not singer_name.lower().startswith(normalized_query):
                            continue
                    else:
                        if not song_name.lower().startswith(normalized_query):
                            continue
                if len(songs) >= 24:
                    break
                songs.append({
                    "id": idx,
                    "name": song_name,
                    "artist": row.get("artist", ""),
                    "singer": singer_name,
                    "album": row.get("album", ""),
                    "image": row.get("image", ""),
                    "audio_url": row.get("audio_url", ""),
                    "year": row.get("year", ""),
                    "duration": row.get("duration", ""),
                })
    except FileNotFoundError:
        songs = []

    return render(request, "tune_app/user/song.html", {
        "songs": songs,
        "search_query": search_query,
        "search_type": search_type,
    })


# def song_player(request, song_id):
#     csv_path = Path(settings.BASE_DIR) / "tune_app" / "dataset" / "songs.csv"
#     songs = []

#     try:
#         with csv_path.open(newline='', encoding='utf-8') as csvfile:
#             reader = csv.DictReader(csvfile)
#             for idx, row in enumerate(reader):
#                 songs.append({
#                     "id": idx,
#                     "name": row.get("song_name", ""),
#                     "artist": row.get("artist", ""),
#                     "singer": row.get("singer", ""),
#                     "album": row.get("album", ""),
#                     "image": row.get("image", ""),
#                     "audio_url": row.get("audio_url", ""),
#                     "year": row.get("year", ""),
#                     "duration": row.get("duration", ""),
#                     "description": row.get("description", ""),
#                 })
#     except FileNotFoundError:
#         raise Http404("Song not found")

#     song = next((item for item in songs if item["id"] == song_id), None)
#     if not song:
#         raise Http404("Song not found")

#     return render(request, "tune_app/user/music_player.html", {
#         "song": song,
#     })



###### New Music Player #####
def song_player(request, song_id):

    csv_path = (
        Path(settings.BASE_DIR)
        / "tune_app"
        / "dataset"
        / "songs.csv"
    )

    songs = []

    try:

        with csv_path.open(
            newline="",
            encoding="utf-8"
        ) as csvfile:

            reader = csv.DictReader(csvfile)

            for idx, row in enumerate(reader):

                songs.append({
                    "id": idx,
                    "song_id": row.get("song_id", ""),
                    "name": row.get("song_name", ""),
                    "artist": row.get("artist", ""),
                    "singer": row.get("singer", ""),
                    "album": row.get("album", ""),
                    "label": row.get("label", ""),
                    "image": row.get("image", ""),
                    "audio_url": row.get("audio_url", ""),
                    "year": row.get("year", ""),
                    "duration": row.get("duration", ""),
                    "playCount": row.get("playCount", ""),
                    "language": row.get("language", ""),
                    "description": row.get("description", ""),
                })

    except FileNotFoundError:
        raise Http404("Song file not found")

    # Find selected song
    song = next(
        (
            item
            for item in songs
            if item["id"] == song_id
        ),
        None
    )

    if not song:
        raise Http404("Song not found")

    # Get KNN recommendations
    recommended_songs = get_song_recommendations(
        songs,
        song,
        number_of_songs=5
    )

    return render(
        request,
        "tune_app/user/music_player.html",
        {
            "song": song,
            "recommended_songs": recommended_songs,
        }
    )

###Song Recomendation#####
def get_song_recommendations(songs, selected_song, number_of_songs=5):

    if len(songs) <= 1:
        return []

    df = pd.DataFrame(songs)

    # Convert numeric columns
    df["duration"] = pd.to_numeric(
        df["duration"],
        errors="coerce"
    ).fillna(0)

    df["year"] = pd.to_numeric(
        df["year"],
        errors="coerce"
    ).fillna(0)

    df["playCount"] = pd.to_numeric(
        df["playCount"],
        errors="coerce"
    ).fillna(0)

    # Features used by KNN
    categorical_features = [
        "artist",
        "singer",
        "album",
        "label",
        "language"
    ]

    numeric_features = [
        "duration",
        "year",
        "playCount"
    ]

    # Convert categorical data into numbers
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore"),
                categorical_features
            ),
            (
                "numeric",
                StandardScaler(),
                numeric_features
            )
        ]
    )

    # Create feature matrix
    X = preprocessor.fit_transform(df)

    # KNN model
    knn = NearestNeighbors(
        n_neighbors=min(number_of_songs + 1, len(df)),
        metric="cosine"
    )

    knn.fit(X)

    # Find selected song index
    selected_index = df.index[
        df["id"] == selected_song["id"]
    ].tolist()[0]

    # Find nearest songs
    distances, indices = knn.kneighbors(
        X[selected_index:selected_index + 1]
    )

    recommendations = []

    for distance, index in zip(distances[0], indices[0]):

        # Don't recommend the currently playing song
        if index == selected_index:
            continue

        song = songs[index].copy()

        # Optional similarity percentage
        similarity = (1 - distance) * 100

        song["similarity"] = round(
            similarity,
            2
        )

        recommendations.append(song)

        if len(recommendations) >= number_of_songs:
            break

    return recommendations


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
            "x": "Language",
            "y": "PlayCount"
        }
    )
   bar_fig.update_layout(
    plot_bgcolor="#598B88",   # the area behind the bars
    paper_bgcolor="#555858",  # the area behind the whole chart (title, axes, margins)
    font_color="white"        # so text stays readable against the dark background
)

   
   bar_fig.update_traces(marker_color="#194643")
   bar_fig.update_xaxes(tickangle=-45)
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
   pie_fig.update_traces(
    marker=dict(
        colors=[ "#DCE3E2", "#C5D0D0", "#A3B5B3", "#809997",
    "#5E7D7B", "#3B615F", "#194643", "#153B38",
    "#11312E", "#0D2624"],
        line=dict(color="#4A4A4A", width=2)
    )
)
   
   pie_fig.update_layout(
    plot_bgcolor="#1B1E38",
    paper_bgcolor="#555858",
    font_color="white",
    legend=dict(font=dict(color="white"))
)
   
   pie_chart = pie_fig.to_html(full_html=False)

   #### Line Chart for Year Distribution ####

   year_count = df["year"].value_counts().sort_index()
   line_fig=px.line(  
      x=year_count.index,
      y=year_count.values,
      title="Year Distribution",

        labels={
            "x": "Year",
            "y": "Album" 
        }
   )
   line_fig.update_traces(
    line=dict(color="#054742", width=3),
    marker=dict(color="#1CC0A7", size=6)
   )
   line_fig.update_layout(
    plot_bgcolor="#598B88",
    paper_bgcolor="#555858",
    font_color="white"
   )
   line_fig.update_xaxes(gridcolor="rgba(255,255,255,0.15)")
   line_fig.update_yaxes(gridcolor="rgba(255,255,255,0.15)")
   
   line_chart = line_fig.to_html(full_html=False)
    

   return bar_chart, pie_chart,line_chart