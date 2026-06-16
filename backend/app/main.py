from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import chat, admin

app = FastAPI(title="Smart Tour Guide API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

@app.get("/")
def root():
    return {"message": "Smart Tour Guide API is running"}
