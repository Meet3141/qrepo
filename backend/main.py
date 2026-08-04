from fastapi import FastAPI
from fastapi.responses import Response

app = FastAPI(title="QRepo API")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(content=b"", media_type="image/x-icon")

@app.get("/")
def root():
    return {"message": "QRepo Backend Running"}