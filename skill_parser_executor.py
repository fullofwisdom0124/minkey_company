import json
import requests
from pathlib import Path

def parse_skill_file(skill_file_path):
    """
    Parses a Skill.md file and extracts the skill information.
    This assumes the Skill.md file is written in Markdown format with JSON/code blocks for skill descriptions.

    Args:
        skill_file_path (str): Path to the Skill.md file.

    Returns:
        dict: Parsed skill information (e.g. name, parameters, etc.)
    """
    try:
        with open(skill_file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Extract skill information between code blocks (assuming JSON-like structure in the Markdown file)
        start = content.find("```json")
        end = content.find("```", start + 1)

        if start == -1 or end == -1:
            raise ValueError("No JSON block found in Skill.md")

        skill_json = content[start + 7:end].strip()  # Extract JSON from the code block
        return json.loads(skill_json)

    except ValueError as ve:
        print(f"Error parsing Skill.md: {ve}")
        return None
    except Exception as e:
        print(f"An error occurred: {e}")
        return None


def execute_skill(skill_data, input_data, llm_url, model):
    """
    Executes a skill using the specified LLM (Language Model).

    Args:
        skill_data (dict): Parsed skill data containing parameters and details.
        input_data (dict): Input data conforming to the 'skill_data' schema.
        llm_url (str): The URL of the custom LLM endpoint.
        model (str): The specific model to use during execution.

    Returns:
        dict: Response from the LLM.
    """
    # Prepare payload for execution
    payload = {
        "model": model,
        "skill": skill_data,
        "input": input_data
    }

    try:
        response = requests.post(
            llm_url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(payload)
        )
        
        if response.status_code != 200:
            raise ValueError(f"LLM execution failed with status code {response.status_code}")
        
        return response.json()

    except Exception as e:
        print(f"An error occurred during skill execution: {e}")
        return None


def main():
    print("Skill Parser and Executor")
    
    # User-provided inputs
    skill_file = input("Enter the path to Skill.md: ").strip()
    llm_url = input("Enter the LLM API URL: ").strip()
    model = input("Enter the model name (e.g., 'gpt-4', 'custom-llm-v1'): ").strip()
    input_json = input("Enter the input JSON data (as a string): ").strip()

    # Load input JSON
    try:
        input_data = json.loads(input_json)
    except json.JSONDecodeError:
        print("Invalid input JSON. Please provide valid JSON.")
        return

    # Parse Skill.md
    skill_data = parse_skill_file(skill_file)
    if not skill_data:
        print("Failed to parse Skill.md. Exiting.")
        return
    
    # Execute the skill using LLM
    result = execute_skill(skill_data, input_data, llm_url, model)
    if result:
        print("Skill Execution Result:")
        print(json.dumps(result, indent=2))
    else:
        print("Skill execution failed.")

if __name__ == "__main__":
    main()