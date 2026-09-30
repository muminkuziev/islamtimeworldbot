from fastapi.testclient import TestClient

from server import app


client = TestClient(app)


def test_avar_verified_corpus_integrity():
    seen_ids = set()
    seen_text = set()
    rows = []
    page = 1
    while True:
        response = client.get("/api/avar-hadiths", params={"page": page, "limit": 50})
        assert response.status_code == 200
        payload = response.json()
        assert payload["language"] == "av"
        assert payload["verified"] is True
        assert payload["total"] == 194
        assert payload["pages"] == 4
        for row in payload["hadiths"]:
            assert row["language"] == "av"
            assert row["grade"] == "sahih"
            assert row["source"] == "as-salam.press"
            assert row["source_url"].startswith("https://as-salam.press/ava/")
            assert row["text"].strip()
            assert row["attribution"] in {
                "Sahih al-Bukhari",
                "Sahih Muslim",
                "Sahih al-Bukhari + Sahih Muslim",
            }
            assert row["id"] not in seen_ids
            assert row["text"] not in seen_text
            seen_ids.add(row["id"])
            seen_text.add(row["text"])
            rows.append(row)
        if page >= payload["pages"]:
            break
        page += 1

    assert len(rows) == 194


def test_avar_facets_detail_search_and_compatibility():
    facets = client.get("/api/avar-hadiths/books").json()
    assert facets["verified"] is True
    assert facets["language"] == "av"
    assert facets["total"] == 194
    counts = {row["name"]: row["count"] for row in facets["books"]}
    assert counts == {
        "Sahih Muslim": 80,
        "Sahih al-Bukhari": 60,
        "Sahih al-Bukhari + Sahih Muslim": 54,
    }

    first = client.get("/api/avar-hadiths", params={"limit": 1}).json()["hadiths"][0]
    detail = client.get("/api/avar-hadiths", params={"hadith_id": first["id"]}).json()
    assert detail["total"] == 1
    assert detail["hadiths"] == [first]

    token = first["text"].split()[0]
    search = client.get("/api/avar-hadiths", params={"q": token, "limit": 50}).json()
    assert search["total"] >= 1
    assert any(row["id"] == first["id"] for row in search["hadiths"])

    compat = client.get("/api/hadith", params={"lang": "av", "limit": 12}).json()
    assert compat["language"] == "av"
    assert compat["total"] == 194
    assert all(row["language"] == "av" for row in compat["hadiths"])
