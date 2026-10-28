from django.urls import path,include
from.import views,user_views,admin_views
urlpatterns = [

    path("",views.home,name="home_page"),
    path("about/",views.about_us,name="about_us"),
    path("contact/",views.contact_us,name="contact_us"),
    path("faq/",views.faq,name="faq_page"),
    path("login/",user_views.login,name="user_login_page"),
    path("registration/",user_views.registration,name="user_registration_page"),
    path("feedback/",user_views.feedback,name="feedback"),

######### Admin Urls #########
    path("admin_login/",admin_views.admin_login,name="admin_login"),
    path("admin_home/",admin_views.admin_home,name="admin_home"),
    path("admin_profile/",admin_views.admin_profile,name="admin_profile"),
    path("admin_logout/",admin_views.admin_logout,name="admin_logout"),

######## User Urls #########
    path("user_home/",user_views.user_home,name="user_home"),
    path("user_profile/",user_views.user_profile,name="user_profile"),
    path("user_logout/",user_views.user_logout,name="user_logout"),
    path("user_edit_profile/",user_views.user_edit_profile,name="user_edit_profile"),





######## XXXXXX #########
    path("model_training/",admin_views.model_training,name="model_training"),



### Song Player Urls###
   path("user_songs/",user_views.song_list,name="user_song_page"),
   path("user_songs/<int:song_id>/", user_views.song_player, name="user_song_player"),



]









