import requests
import json
import sys
from pandas import json_normalize

access_token = sys.argv[1]
artist_id_pairs = []
rec_artists = {"artists": []}
genres = {}
time_range = sys.argv[2]
if time_range == "undefined":
    time_range = "long_term"
url = "https://api.spotify.com/v1/me/top/artists?time_range=" + time_range + "&limit=50"
response = requests.get(
    url,
    headers = {"Authorization": "Bearer " + access_token}
)
for artist in json_normalize(response.json())["items"][0]:
    artist_id_pairs.append((artist["name"], artist["id"]))
    for genre in artist["genres"]:
        if not genre in genres.keys():
            genres[genre] = 1
        else:
            genres[genre] += 1
res = []
for key, val in genres.items():
    res.append([key] + [val])
res.sort(key=lambda x: x[1], reverse=True)
res = res[:10]
top_genres = [x[0] for x in res]
for artist_name, id in artist_id_pairs:
    response = requests.get(
        "https://api.spotify.com/v1/artists/%s/related-artists" % (id),
        headers = {"Authorization": "Bearer " + access_token}
    )
    for artist in json_normalize(response.json())["artists"][0]:
        if not artist["id"] in [x[1] for x in artist_id_pairs] and not artist["id"] in [x["id"] for x in rec_artists["artists"]] and len(list(set(artist["genres"]) & set(top_genres))) > 3:
            artist["common_genres"] = list(set(artist["genres"]) & set(top_genres))
            artist = {key: artist[key] for key in ["id", "images", "name", "common_genres"]}
            artist["images"] = artist["images"][0]
            rec_artists["artists"].append(artist)
print(json.dumps(rec_artists))
