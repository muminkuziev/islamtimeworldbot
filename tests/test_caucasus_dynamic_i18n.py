from domain.prayer import extras

def test_caucasus_dynamic_weather_labels_are_not_english_fallbacks():
    for key,row in extras._WEATHER_DESCS.items():
        assert row.get('ce')
        assert row.get('av')
        assert row['ce'] != row['en']
        assert row['av'] != row['en']

    assert len(extras._DAY_NAMES['ce'])==7
    assert len(extras._DAY_NAMES['av'])==7

    for code,row in extras._WIND_DIR.items():
        assert row.get('ce')
        assert row.get('av')

    for key,row in extras._AQI_LABELS.items():
        assert row.get('ce')
        assert row.get('av')
        assert row['ce'] != row['en']
        assert row['av'] != row['en']
