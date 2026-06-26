import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

import main
from train import load_data, save_artifacts, train_two_layer_model


ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "data" / "housing_train.csv"


class ModelBehaviorTest(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        df = load_data(str(DATA_PATH))
        base_model, premium_model, scaler, metadata = train_two_layer_model(df)
        save_artifacts(base_model, premium_model, scaler, metadata, self.tmpdir.name)

        os.environ["MODEL_DIR"] = self.tmpdir.name
        main.model_state = main.ModelState()

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_api_contract_and_model_info(self):
        payload = {
            "square_footage": 1500,
            "bedrooms": 3,
            "bathrooms": 2,
            "year_built": 2000,
            "lot_size": 7000,
            "distance_to_city_center": 4.0,
            "school_rating": 8.0,
        }

        with TestClient(main.app) as client:
            health = client.get("/health")
            self.assertEqual(health.status_code, 200)
            self.assertTrue(health.json()["model_loaded"])

            prediction = client.post("/predict", json=payload)
            self.assertEqual(prediction.status_code, 200)
            self.assertGreaterEqual(prediction.json()["predicted_price"], 0)

            batch = client.post("/predict/batch", json={"items": [payload, payload]})
            self.assertEqual(batch.status_code, 200)
            self.assertEqual(batch.json()["count"], 2)
            self.assertEqual(len(batch.json()["predictions"]), 2)

            model_info = client.get("/model-info")
            self.assertEqual(model_info.status_code, 200)
            self.assertEqual(model_info.json()["model_type"], "TwoLayerMonotonicModel")
            self.assertIn("metrics", model_info.json())

    def test_square_footage_is_monotonic_and_non_negative(self):
        base_payload = {
            "bedrooms": 3,
            "bathrooms": 2,
            "year_built": 2000,
            "lot_size": 7000,
            "distance_to_city_center": 4.0,
            "school_rating": 8.0,
        }
        square_footages = [200, 250, 500, 1000, 1500, 2000, 2500, 3000]

        with TestClient(main.app) as client:
            prices = [
                client.post(
                    "/predict",
                    json={**base_payload, "square_footage": square_footage},
                ).json()["predicted_price"]
                for square_footage in square_footages
            ]

        self.assertTrue(all(price >= 0 for price in prices), prices)
        self.assertGreater(prices[0], 0, prices)
        self.assertEqual(prices, sorted(prices), prices)


if __name__ == "__main__":
    unittest.main()
