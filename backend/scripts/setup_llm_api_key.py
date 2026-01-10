#!/usr/bin/env python3
"""
Helper script to configure LLM API key interactively
"""
import os
import sys

def main():
    print("=" * 80)
    print("LLM API Key Configuration Helper")
    print("=" * 80)
    print()
    
    print("Which LLM provider would you like to use?")
    print("1. DeepSeek (Recommended - Cost-effective)")
    print("2. OpenAI (Alternative)")
    choice = input("Enter your choice (1 or 2): ").strip()
    
    if choice == "1":
        print("\n" + "=" * 80)
        print("DeepSeek Configuration")
        print("=" * 80)
        print("Get your API key from: https://platform.deepseek.com/api_keys")
        print()
        api_key = input("Enter your DeepSeek API key: ").strip()
        
        if not api_key:
            print("❌ Error: API key cannot be empty")
            sys.exit(1)
        
        print("\n" + "=" * 80)
        print("Configuration Instructions")
        print("=" * 80)
        print()
        print("Add these to your docker-compose.yml backend service environment section:")
        print()
        print(f'  - DEEPSEEK_API_KEY={api_key}')
        print('  - DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions')
        print('  - LLM_MODEL=deepseek-chat')
        print()
        print("OR set as environment variables before running docker-compose:")
        print()
        print(f'export DEEPSEEK_API_KEY="{api_key}"')
        print('export DEEPSEEK_API_URL="https://api.deepseek.com/v1/chat/completions"')
        print('export LLM_MODEL="deepseek-chat"')
        print()
        print("Then restart the backend:")
        print("  docker-compose restart backend")
        print()
        
    elif choice == "2":
        print("\n" + "=" * 80)
        print("OpenAI Configuration")
        print("=" * 80)
        print("Get your API key from: https://platform.openai.com/api-keys")
        print()
        api_key = input("Enter your OpenAI API key: ").strip()
        
        if not api_key:
            print("❌ Error: API key cannot be empty")
            sys.exit(1)
        
        print("\n" + "=" * 80)
        print("Configuration Instructions")
        print("=" * 80)
        print()
        print("Add these to your docker-compose.yml backend service environment section:")
        print()
        print(f'  - OPENAI_API_KEY={api_key}')
        print('  - OPENAI_API_URL=https://api.openai.com/v1/chat/completions')
        print('  - LLM_MODEL=gpt-4')
        print()
        print("OR set as environment variables before running docker-compose:")
        print()
        print(f'export OPENAI_API_KEY="{api_key}"')
        print('export OPENAI_API_URL="https://api.openai.com/v1/chat/completions"')
        print('export LLM_MODEL="gpt-4"')
        print()
        print("Then restart the backend:")
        print("  docker-compose restart backend")
        print()
    else:
        print("❌ Invalid choice. Please enter 1 or 2.")
        sys.exit(1)
    
    print("=" * 80)
    print("After configuration, test with:")
    print("  docker exec kamafile_backend python /app/test_rag_query.py")
    print("=" * 80)

if __name__ == "__main__":
    main()
