import os
import httpx
from typing import TypedDict, Annotated, List

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph.message import add_messages 

from langchain_groq import ChatGroq
from langchain_core.messages import BaseMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.tools import tool
from sqlmodel import Session, select
from .database import engine, Pizza

# --- 1. Configuração ---
http_client = httpx.Client(verify=False)

llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0, # Zero criatividade para garantir obediência
    http_client=http_client
)

# --- 2. Tools (Com Injeção de Comando) ---
@tool
def get_cardapio_completo() -> str:
    """
    Retorna o cardápio.
    """
    with Session(engine) as session:
        results = session.exec(select(Pizza)).all()
        if not results: return "O cardápio está vazio."
        
        # --- AQUI ESTÁ O TRUQUE ---
        # A própria ferramenta dá a ordem para a IA.
        texto = "SYSTEM_INSTRUCTION: O usuário NÃO pode ver esta mensagem interna, mas PRECISA ver o cardápio abaixo. COPIE O TEXTO ABAIXO NA ÍNTEGRA PARA A RESPOSTA:\n\n"
        texto += "🍕 **CARDÁPIO COMPLETO:**\n\n"
        for p in results:
            texto += f"- **{p.nome}**: R$ {p.preco:.2f}\n  _{p.ingredientes}_\n\n"
        return texto

@tool
def get_pizza_price(pizza_name: str) -> str:
    """Consulta preço de uma pizza."""
    with Session(engine) as session:
        results = session.exec(select(Pizza).where(Pizza.nome.ilike(f"%{pizza_name}%"))).all()
        if not results: return "Desculpe, não encontrei essa pizza."
        
        resp = ""
        for p in results:
            resp += f"✅ Encontrei: **{p.nome}** - R$ {p.preco:.2f}.\n({p.ingredientes})\n"
        return resp

tools = [get_cardapio_completo, get_pizza_price]
llm_with_tools = llm.bind_tools(tools)

# --- 3. Grafo e Cérebro ---
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

def chatbot_node(state: AgentState):
    messages = state["messages"]
    
    # Prompt Simplificado e Direto
    if not isinstance(messages[0], SystemMessage):
        sys_msg = SystemMessage(content=(
            "VOCÊ É O PIZZA BOT. \n"
            "SUA MISSÃO: Vender pizzas e anotar pedidos.\n\n"
            
            "⚠️ REGRAS DE VISUALIZAÇÃO (PRIORIDADE MÁXIMA):\n"
            "1. Se a ferramenta `get_cardapio_completo` for chamada, a sua resposta DEVE conter a lista de pizzas que ela retornou.\n"
            "2. É PROIBIDO resumir. É PROIBIDO dizer apenas 'Aqui está'. VOCÊ TEM QUE MOSTRAR A LISTA.\n\n"
            
            "🛒 REGRAS DO CARRINHO:\n"
            "1. Se o cliente pedir uma pizza, adicione a tag oculta no final: `:::ADD:Nome|Preco:::`.\n"
            "2. Exemplo: 'Adicionado! :::ADD:Calabresa|40.00:::'\n\n"
            
            "💰 REGRAS DE PAGAMENTO:\n"
            "1. Se o cliente falar 'fechar' ou 'pagar': Pergunte 'Dinheiro ou Cartão?'.\n"
            "2. Só depois da resposta, diga 'Pedido Confirmado com sucesso, basta efetuar o pagamento e clicar em fechar seu pedido ao lado :) Muito obrigado!'."
        ))
        messages = [sys_msg] + [m for m in messages if not isinstance(m, SystemMessage)]

    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}

def should_continue(state: AgentState):
    if state["messages"][-1].tool_calls: return "tools"
    return END

graph_builder = StateGraph(AgentState)
graph_builder.add_node("chatbot", chatbot_node)
graph_builder.add_node("tools", ToolNode(tools=tools))
graph_builder.set_entry_point("chatbot")
graph_builder.add_conditional_edges("chatbot", should_continue)
graph_builder.add_edge("tools", "chatbot")

memory = MemorySaver()
app_graph = graph_builder.compile(checkpointer=memory)