from django.contrib import admin
from .models import PortalAdmin,Contact,Feedback,UserDetail

class ContactAdmin(admin.ModelAdmin):
    list_display=["email","name","phone","query","date"]

class FeedbackAdmin(admin.ModelAdmin):
    list_display=["name","email","rating","review","date"]  

class UserdetailsAdmin(admin.ModelAdmin):
    list_display=["email","username","date"]

class PortalAdminDetail(admin.ModelAdmin):
    list_display=["name","email","password","phone"]          

# Register your models here.
admin.site.register(PortalAdmin,PortalAdminDetail)
admin.site.register(Contact,ContactAdmin)
admin.site.register(Feedback,FeedbackAdmin)
admin.site.register(UserDetail,UserdetailsAdmin)


### Customizing Admin Panel##
admin.site.site_header="MelodyMatch AI Admin"
admin.site.site_title="MelodyMatch AI"
admin.site.index_title="Weclome to MelodyMatch AI Portal"


