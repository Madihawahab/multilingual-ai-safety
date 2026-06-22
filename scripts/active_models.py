import os
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from the .env file
load_dotenv()

# This will now correctly find the key from your .env file
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Fetch and print active models
models_list = client.models.list()
active_models = {m.id.split('/')[-1]: m.id for m in models_list.data}
print(active_models)
