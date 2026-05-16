import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from config import settings
from google import genai

def test():
    try:
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            with open('gemini_test_out.txt', 'w') as f:
                f.write('EXCEPTION: GEMINI_API_KEY is empty in settings.')
            return

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents='Hello Gemini'
        )
        with open('gemini_test_out.txt', 'w', encoding='utf-8') as f:
            f.write('SUCCESS: ' + str(response.text))
    except Exception as e:
        with open('gemini_test_out.txt', 'w', encoding='utf-8') as f:
            f.write('EXCEPTION: ' + repr(e))

if __name__ == '__main__':
    test()
