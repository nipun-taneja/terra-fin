import requests  # type: ignore[import]
import json
import time

BASE_URL = "http://localhost:8000"
TEST_EMAIL = f"test_user_{int(time.time())}@example.com"

def test_full_flow():
    print(f"Starting verification for {TEST_EMAIL}...")

    # 1. Analyze Field
    print("\n1. Testing /api/analyze...")
    analyze_payload = {
        "crop_type": "maize",
        "lat": 41.5,
        "lon": -93.6,
        "farm_size_hectares": 120.5
    }
    res = requests.post(f"{BASE_URL}/api/analyze", json=analyze_payload)
    if res.status_code != 200:
        print(f"FAILED: /api/analyze returned {res.status_code}")
        print(res.text)
        return
    
    analysis_data = res.json()
    print(f"DEBUG: Raw /api/analyze response: {res.text}")
    analysis_id = analysis_data.get("analysis_id")
    print(f"SUCCESS: Received analysis_id: '{analysis_id}' (len: {len(str(analysis_id))})")

    # 2. Save Farm
    print("\n2. Testing /api/profile/save-farm...")
    farm_payload = {
        "email": TEST_EMAIL,
        "farm": {
            "farm_name": "Antigravity Test Farm",
            "state": "Iowa",
            "country": "USA"
        },
        "fields": [
            {
                "field_name": "Main Cornfield",
                "latitude": 41.5,
                "longitude": -93.6,
                "area_value": 300,
                "area_unit": "acre",
                "crop_type": "maize",
                "baseline": {
                    "tillage_passes": 3,
                    "fertilizer_amount": 100,
                    "fertilizer_unit": "lb_N_per_acre",
                    "irrigation_events": 2
                },
                "project": {
                    "tillage_passes": 1
                }
            }
        ]
    }
    res = requests.post(f"{BASE_URL}/api/profile/save-farm", json=farm_payload)
    if res.status_code != 200:
        print(f"FAILED: /api/profile/save-farm returned {res.status_code}")
        print(res.text)
        return
    print("SUCCESS: Farm and field saved.")

    # 3. Link Analysis
    print(f"\n3. Testing /api/profile/save (Link Analysis)...")
    res = requests.post(f"{BASE_URL}/api/profile/save?email={TEST_EMAIL}&analysis_id={analysis_id}")
    if res.status_code != 200:
        print(f"FAILED: /api/profile/save returned {res.status_code}")
        print(res.text)
        return
    print("SUCCESS: Analysis linked to user.")

    # 4. Load Profile
    print("\n4. Testing /api/profile/load...")
    res = requests.get(f"{BASE_URL}/api/profile/load?email={TEST_EMAIL}")
    if res.status_code != 200:
        print(f"FAILED: /api/profile/load returned {res.status_code}")
        print(res.text)
        return
    
    profile = res.json()
    print("SUCCESS: Profile loaded.")
    
    # Verify contents
    farm = profile.get("farm")
    fields = profile.get("fields", [])
    latest_analysis = profile.get("latest_analysis")

    print("\nVerifying Data Integrity:")
    print(f"- Farm Name: {farm.get('farm_name') if farm else 'NONE'}")
    print(f"- Country: {farm.get('country') if farm else 'NONE'}")
    print(f"- Number of Fields: {len(fields)}")
    if fields:
        print(f"  - Field Baseline: {fields[0].get('baseline')}")
    print(f"- Latest Analysis ID: {latest_analysis.get('analysis_id') if latest_analysis else 'NONE'}")

    if farm and farm.get("country") == "USA" and len(fields) > 0 and fields[0].get("baseline") and latest_analysis:
        print("\nALL PERSISTENCE TESTS PASSED!")
    else:
        print("\nVERIFICATION FAILED: Data mismatch.")

if __name__ == "__main__":
    test_full_flow()
