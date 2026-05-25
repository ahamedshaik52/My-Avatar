import os
import uuid
import shutil
from pathlib import Path
from typing import Optional
import boto3
from botocore.exceptions import ClientError
from app.core.config import get_settings

settings = get_settings()


class StorageService:
    def __init__(self):
        self.backend = settings.STORAGE_BACKEND
        if self.backend == "s3":
            self.s3 = boto3.client(
                "s3",
                region_name=settings.S3_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            )
        else:
            Path(settings.LOCAL_STORAGE_PATH).mkdir(parents=True, exist_ok=True)

    def save(self, file_path: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        if self.backend == "s3":
            self.s3.put_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=file_path,
                Body=data,
                ContentType=content_type,
            )
            return f"https://{settings.S3_BUCKET_NAME}.s3.{settings.S3_REGION}.amazonaws.com/{file_path}"
        else:
            full_path = Path(settings.LOCAL_STORAGE_PATH) / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_bytes(data)
            return f"/media/{file_path}"

    def save_file(self, src_path: str, dest_key: str) -> str:
        if self.backend == "s3":
            with open(src_path, "rb") as f:
                return self.save(dest_key, f.read())
        else:
            dest = Path(settings.LOCAL_STORAGE_PATH) / dest_key
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src_path, dest)
            return f"/media/{dest_key}"

    def get_signed_url(self, file_key: str, expires: int = 3600) -> str:
        if self.backend == "s3":
            return self.s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.S3_BUCKET_NAME, "Key": file_key},
                ExpiresIn=expires,
            )
        return f"/media/{file_key}"

    def delete(self, file_key: str) -> None:
        if self.backend == "s3":
            self.s3.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=file_key)
        else:
            path = Path(settings.LOCAL_STORAGE_PATH) / file_key
            if path.exists():
                path.unlink()

    def generate_key(self, prefix: str, ext: str) -> str:
        return f"{prefix}/{uuid.uuid4().hex}{ext}"


storage = StorageService()
