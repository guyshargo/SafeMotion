from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from routers.user_router import router as user_router
from routers.session_router import router as session_router

# FastAPI app instance
app = FastAPI(
    title="SafeMotion Server",
    description="SafeMotion Server API",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root endpoint
@app.get("/")
def root():
    return {"message": "SafeMotion Server API", "docs": "/docs"}


# Health check endpoint
@app.get("/health")
def health():
    return {"status": "ok"}


# Include user routes 
app.include_router(user_router)
app.include_router(session_router)

if __name__ == "__main__":
    print("\n- - - SafeMotion Server API is running - - -")

    print()

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )