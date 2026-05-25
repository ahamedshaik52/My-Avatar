from celery import Celery
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery("myavatar")
celery_app.config_from_object(settings.celery_config)
celery_app.autodiscover_tasks(["app.workers"])
