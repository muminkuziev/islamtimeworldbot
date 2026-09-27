"""All repository tests run without real credentials or user storage."""
import os

os.environ["ISLAMTIME_QA_MODE"] = "1"
os.environ["BOT_TOKEN"] = ""
os.environ["ENABLE_SCHEDULER"] = "false"
os.environ["RENDER"] = ""
os.environ["LOCAL_WEBHOOK"] = ""
os.environ["PYTHON_DOTENV_DISABLED"] = "1"
