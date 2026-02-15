import sys
import os
from pathlib import Path

# Add project root to sys.path
sys.path.append(str(Path(__file__).parent.parent))

try:
    from app.services.storage_mongo import save_analysis  # type: ignore[import]
    print("Import successful.")
    
    aid = save_analysis(
        farm_name="Test Farm",
        state="Test State",
        analysis_window={"start": "now", "end": "later"},
        result={"test": "data"}
    )
    print(f"Analysis saved! ID: {aid}")
except Exception as e:
    print(f"Error occurred: {e}")
    import traceback
    traceback.print_exc()
