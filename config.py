import os
from dotenv import load_dotenv
from urllib.parse import quote_plus
from configparser import ConfigParser


load_dotenv()

def config(filename="database.ini", section="postgresql"):
    parser = ConfigParser()
    parser.read(filename)

    db = {}
    if parser.has_section(section):
        params = parser.items(section)
        for param in params:
            db[param[0]] = param[1]
    else:
        raise Exception(f"Section {section} not found in the {filename} file.")
    return db


class Config:
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'Harvi@57')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5432')
    DB_NAME = os.getenv('DB_NAME', 'Drone-Tag')  # Fixed correct DB name

    encoded_password = quote_plus(DB_PASSWORD)

    SQLALCHEMY_DATABASE_URI = 'postgresql://postgres:Harvi%4057@localhost:5432/Drone-Tag'

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.urandom(24)
    

    # AWS_API_ENDPOINT = os.getenv('AWS_API_ENDPOINT',
    #     'https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data')
# Drone trajectory API (POST)
    AWS_TRAJECTORY_API = os.getenv(
        'AWS_TRAJECTORY_API',
        'https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data'
    )

    # Sensor data API (GET)
    AWS_SENSOR_API = os.getenv(
        'AWS_SENSOR_API',
        'https://pg2y9zc74l.execute-api.ap-south-1.amazonaws.com/data/json'
    )
