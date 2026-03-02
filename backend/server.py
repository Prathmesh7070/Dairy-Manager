from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get("JWT_SECRET", "dairy-secret-key-2025")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

security = HTTPBearer()

# Models
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    message: str

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    address: str
    advance: float = 0.0
    photo: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    name: str
    phone: str
    address: str
    advance: float = 0.0

class MilkEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    date: str
    shift: str  # morning or evening
    quantity: float
    fat: float
    snf: float
    degree: float
    rate: float
    amount: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MilkEntryCreate(BaseModel):
    customer_id: str
    date: str
    shift: str
    quantity: float
    fat: float
    snf: float

class RateConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    base_rate: float = 35.0
    effective_date: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RateConfigCreate(BaseModel):
    base_rate: float
    effective_date: str

class FeedBrand(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price_per_bag: float

class FeedBrandCreate(BaseModel):
    name: str
    price_per_bag: float

class FeedDistribution(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    date: str
    feed_type: str
    brand_id: str
    bags: float
    amount: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FeedDistributionCreate(BaseModel):
    customer_id: str
    date: str
    feed_type: str
    brand_id: str
    bags: float
    

# Helper functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_degree(fat: float, snf: float) -> float:
    # Degree = 4 * (SNF - (0.2 * FAT) - 0.36)
    return round(4 * (snf - (0.2 * fat) - 0.36), 2)

def calculate_rate(fat: float, snf: float, base_rate: float = 35.0) -> float:
    # Rate = base_rate + (Fat - 3.5) * 1 + (SNF - 8.5) * 10
    return round(base_rate + (fat - 3.5) * 1 + (snf - 8.5) * 10, 2)

# Authentication endpoints
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    # Simple authentication - username: admin, password: swami
    if request.username == "admin" and request.password == "swami":
        token = create_access_token({"sub": request.username})
        return LoginResponse(token=token, message="Login successful")
    raise HTTPException(status_code=401, detail="Invalid credentials")





# Customer endpoints
@api_router.post("/customers", response_model=Customer)
async def create_customer(customer: CustomerCreate, _: dict = Depends(verify_token)):
    customer_obj = Customer(**customer.model_dump())
    doc = customer_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.customers.insert_one(doc)
    return customer_obj

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(_: dict = Depends(verify_token)):
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    for c in customers:
        if isinstance(c['created_at'], str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return customers

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str, _: dict = Depends(verify_token)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    if isinstance(customer['created_at'], str):
        customer['created_at'] = datetime.fromisoformat(customer['created_at'])
    return customer

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer: CustomerCreate, _: dict = Depends(verify_token)):
    result = await db.customers.update_one(
        {"id": customer_id},
        {"$set": customer.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return await get_customer(customer_id)

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, _: dict = Depends(verify_token)):
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted successfully"}

@api_router.post("/customers/{customer_id}/photo")
async def upload_customer_photo(customer_id: str, photo: UploadFile = File(...), _: dict = Depends(verify_token)):
    contents = await photo.read()
    base64_photo = base64.b64encode(contents).decode('utf-8')
    photo_data = f"data:{photo.content_type};base64,{base64_photo}"
    
    result = await db.customers.update_one(
        {"id": customer_id},
        {"$set": {"photo": photo_data}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Photo uploaded successfully", "photo": photo_data}

# Milk entry endpoints
@api_router.post("/milk-entries", response_model=MilkEntry)
async def create_milk_entry(entry: MilkEntryCreate, _: dict = Depends(verify_token)):
    # Get current base rate
    rate_config = await db.rate_configs.find_one({}, {"_id": 0}, sort=[("effective_date", -1)])
    base_rate = rate_config['base_rate'] if rate_config else 35.0
    
    degree = calculate_degree(entry.fat, entry.snf)
    rate = calculate_rate(entry.fat, entry.snf, base_rate)
    amount = round(entry.quantity * rate, 2)
    
    entry_obj = MilkEntry(
        **entry.model_dump(),
        degree=degree,
        rate=rate,
        amount=amount
    )
    
    doc = entry_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    # Update or insert
    await db.milk_entries.update_one(
        {"customer_id": entry.customer_id, "date": entry.date, "shift": entry.shift},
        {"$set": doc},
        upsert=True
    )
    
    return entry_obj

@api_router.get("/milk-entries")
async def get_milk_entries(
    customer_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    shift: Optional[str] = None,
    _: dict = Depends(verify_token)
):
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    if from_date:
        query.setdefault("date", {})["$gte"] = from_date
    if to_date:
        query.setdefault("date", {})["$lte"] = to_date
    if shift:
        query["shift"] = shift
    
    entries = await db.milk_entries.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    for e in entries:
        if isinstance(e.get('created_at'), str):
            e['created_at'] = datetime.fromisoformat(e['created_at'])
    return entries

# Rate config endpoints
@api_router.post("/rate-config", response_model=RateConfig)
async def create_rate_config(config: RateConfigCreate, _: dict = Depends(verify_token)):
    config_obj = RateConfig(**config.model_dump())
    doc = config_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.rate_configs.insert_one(doc)
    return config_obj

@api_router.get("/rate-config/current")
async def get_current_rate(_: dict = Depends(verify_token)):
    rate_config = await db.rate_configs.find_one({}, {"_id": 0}, sort=[("effective_date", -1)])
    if not rate_config:
        # Create default rate config
        default_config = RateConfig(base_rate=35.0, effective_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"))
        doc = default_config.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.rate_configs.insert_one(doc)
        return default_config
    if isinstance(rate_config['created_at'], str):
        rate_config['created_at'] = datetime.fromisoformat(rate_config['created_at'])
    return rate_config

# Feed brand endpoints
@api_router.post("/feed-brands", response_model=FeedBrand)
async def create_feed_brand(brand: FeedBrandCreate, _: dict = Depends(verify_token)):
    brand_obj = FeedBrand(**brand.model_dump())
    doc = brand_obj.model_dump()
    await db.feed_brands.insert_one(doc)
    return brand_obj

@api_router.get("/feed-brands", response_model=List[FeedBrand])
async def get_feed_brands(_: dict = Depends(verify_token)):
    brands = await db.feed_brands.find({}, {"_id": 0}).to_list(1000)
    return brands

# Feed distribution endpoints
@api_router.post("/feed-distributions", response_model=FeedDistribution)
async def create_feed_distribution(dist: FeedDistributionCreate, _: dict = Depends(verify_token)):
    # Get brand price
    brand = await db.feed_brands.find_one({"id": dist.brand_id}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Feed brand not found")
    
    amount = round(dist.bags * brand['price_per_bag'], 2)
    
    dist_obj = FeedDistribution(**dist.model_dump(), amount=amount)
    doc = dist_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.feed_distributions.insert_one(doc)
    return dist_obj

@api_router.get("/feed-distributions")
async def get_feed_distributions(
    customer_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    _: dict = Depends(verify_token)
):
    query = {}
    if customer_id:
        query["customer_id"] = customer_id
    if from_date:
        query.setdefault("date", {})["$gte"] = from_date
    if to_date:
        query.setdefault("date", {})["$lte"] = to_date
    
    distributions = await db.feed_distributions.find(query, {"_id": 0}).sort("date", 1).to_list(1000)
    for d in distributions:
        if isinstance(d.get('created_at'), str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])
    return distributions

# Dashboard stats
@api_router.get("/stats/dashboard")
async def get_dashboard_stats(_: dict = Depends(verify_token)):
    total_customers = await db.customers.count_documents({})
    
    # Today's entries
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    todays_entries = await db.milk_entries.count_documents({"date": {"$regex": today}})
    
    # Current base rate
    rate_config = await db.rate_configs.find_one({}, {"_id": 0}, sort=[("effective_date", -1)])
    base_rate = rate_config['base_rate'] if rate_config else 35.0
    
    # Total advance given
    customers = await db.customers.find({}, {"_id": 0, "advance": 1}).to_list(1000)
    total_advance = sum(c.get('advance', 0) for c in customers)
    
    # Monthly bags sold
    from datetime import date
    first_day = date.today().replace(day=1).isoformat()
    feed_dists = await db.feed_distributions.find(
        {"date": {"$gte": first_day}},
        {"_id": 0, "bags": 1}
    ).to_list(1000)
    monthly_bags = sum(d.get('bags', 0) for d in feed_dists)
    
    return {
        "total_customers": total_customers,
        "todays_entries": todays_entries,
        "base_rate": base_rate,
        "total_advance": round(total_advance, 2),
        "monthly_bags": round(monthly_bags, 2)
    }

# Calculate rate chart
@api_router.get("/rate-chart")
async def get_rate_chart(_: dict = Depends(verify_token)):
    rate_config = await db.rate_configs.find_one({}, {"_id": 0}, sort=[("effective_date", -1)])
    base_rate = rate_config['base_rate'] if rate_config else 35.0
    
    chart = []
    for fat in [3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]:
        for snf in [8.0, 8.5, 9.0, 9.5, 10.0]:
            rate = calculate_rate(fat, snf, base_rate)
            degree = calculate_degree(fat, snf)
            chart.append({
                "fat": fat,
                "snf": snf,
                "degree": degree,
                "rate": rate
            })
    
    return {"base_rate": base_rate, "chart": chart}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
