try:
    import ml_integration
    print("✅ Success: ml_integration imported!")
except Exception as e:
    print(f"❌ Error importing ml_integration: {e}")
    import traceback
    traceback.print_exc()
