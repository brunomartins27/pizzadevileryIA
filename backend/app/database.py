from typing import Optional
from sqlmodel import Field, SQLModel, create_engine, Session, select

# Modelo
class Pizza(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str
    ingredientes: str
    preco: float

# Configuração do Banco
DATABASE_URL = "postgresql://user:password@db:5432/pizzaria"
engine = create_engine(DATABASE_URL)

# Seeding (Povoar o banco)
def init_db():
    SQLModel.metadata.create_all(engine)
    
    with Session(engine) as session:
        # Verifica se já tem dados
        statement = select(Pizza)
        results = session.exec(statement).first()
        
        if not results:
            print("Populando banco de dados com cardápio COMPLETO...")
            pizzas = [
                Pizza(nome="Calabresa", ingredientes="Molho, queijo, calabresa e cebola", preco=40.0),
                Pizza(nome="Mussarela", ingredientes="Molho, queijo mussarela e orégano", preco=35.0),
                Pizza(nome="Portuguesa", ingredientes="Molho, queijo, presunto, ovo, cebola e azeitona", preco=45.0),
                Pizza(nome="Quatro Queijos", ingredientes="Molho, mussarela, provolone, parmesão e gorgonzola", preco=50.0),
                Pizza(nome="Frango com Catupiry", ingredientes="Molho, frango desfiado e catupiry original", preco=42.0),
                Pizza(nome="Marguerita", ingredientes="Molho, mussarela, tomate e manjericão fresco", preco=38.0),
                Pizza(nome="Pepperoni", ingredientes="Molho, mussarela e fatias de pepperoni", preco=48.0),
            ]
            session.add_all(pizzas)
            session.commit()