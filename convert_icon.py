import sys
from PIL import Image

try:
    img = Image.open('public/logo.png')
    img.save('public/rentify.ico', format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (32, 32), (16, 16)])
    print("Icon successfully created at public/rentify.ico")
except Exception as e:
    print(f"Error: {e}")
