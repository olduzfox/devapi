import requests
import sys
import time

BASE_URL = "http://localhost:8000"

def run_tests():
    print("--- Starting FastAPI Provider API Tests ---")
    test_amt = int(time.time()) % 900000 + 100000

    # 1. Add test card
    print("\n1. Testing Add Card...")
    res = requests.post(f"{BASE_URL}/api/cards", json={"name": "HUMOCARD", "card_number": "4271"})
    assert res.status_code == 200, f"Add card failed: {res.text}"
    card_data = res.json()
    print("Card added:", card_data)

    # 2. Create Payment
    print(f"\n2. Testing Create Payment (/create) for amount {test_amt}...")
    res = requests.post(f"{BASE_URL}/create", data={"amount": test_amt})
    assert res.status_code == 200, f"Create payment failed: {res.text}"
    pay_data = res.json()
    print("Payment created:", pay_data)
    payment_id = pay_data["payment_id"]
    assert pay_data["card"]["number"] == "4271"

    # 3. Check Initial Status
    print("\n3. Testing Initial Status (/status/{payment_id})...")
    res = requests.get(f"{BASE_URL}/status/{payment_id}")
    assert res.status_code == 200
    status_data = res.json()
    print("Initial status:", status_data)
    assert status_data["data"]["payment_status"] == "pending"

    # 4. Simulate Card Amount Collision
    print("\n4. Testing Card Amount Collision (400 Expected)...")
    res = requests.post(f"{BASE_URL}/create", data={"amount": test_amt})
    print("Collision response status code:", res.status_code, res.text)
    assert res.status_code == 400

    # 5. Simulate Telegram humocardbot message matching
    print("\n5. Testing Telegram Message Simulation...")
    sim_msg = f"HumoCard bot\nTo'ldirish: {test_amt:,}".replace(",", ".") + f",00 UZS\n💳 *4271\nSana: 07.09.2026 12:00"
    res = requests.post(f"{BASE_URL}/api/simulate-telegram-message", json={"text": sim_msg})
    assert res.status_code == 200
    sim_data = res.json()
    print("Simulation result:", sim_data)
    assert sim_data["matched"] == True

    # 6. Check Status after message matching (Should be PAID)
    print("\n6. Testing Paid Status (/status/{payment_id})...")
    res = requests.get(f"{BASE_URL}/status/{payment_id}")
    assert res.status_code == 200
    paid_status = res.json()
    print("Updated status:", paid_status)
    assert paid_status["data"]["payment_status"] == "paid"

    print("\n✅ ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
