from fastapi import FastAPI
from pydantic import BaseModel
from contextlib import asynccontextmanager
from .database import init_db
from .graph import app_graph
from langchain_core.messages import HumanMessage
from fastapi.middleware.cors import CORSMiddleware

# Inicialização
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_db()
    except Exception as e:
        print(f"Erro DB: {e}")
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatInput(BaseModel):
    message: str

@app.post("/chat")
async def chat_endpoint(input: ChatInput):

    # Aqui usamos um ID fixo "1" para simplificar o teste.
    config = {"configurable": {"thread_id": "1"}}
    
    # Envia a mensagem do usuário
    inputs = {"messages": [HumanMessage(content=input.message)]}
    
    # O invoke agora usa 'config' para salvar o histórico
    result = await app_graph.ainvoke(inputs, config=config)
    
    # Retorna a última mensagem da IA
    last_message = result["messages"][-1].content
    return {"response": last_message}