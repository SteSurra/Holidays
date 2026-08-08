# Travel Research Source Registry

Use this registry to rebuild a destination guide from zero. Verify URLs and facts at research time; schedules, prices, rules, ratings, closures, product models, and emergency information are time-sensitive.

## Source Priority

1. Item-specific official venue, public authority, museum, operator, manufacturer, or producer.
2. Official city, prefecture, regional, or national tourism organization.
3. National cultural, agricultural, transport, health, or safety authority.
4. Specialist discovery catalog for leads and current user signals.
5. Open-license image catalog for media only.

Record `title`, `url`, `kind`, `checkedAt`, destination, content domains, and the claims supported. Never cite an image search result as factual evidence. Do not use a restaurant score as proof of a cuisine's history.

## Destination-Agnostic Sources

| Need | Preferred source types | Use |
|---|---|---|
| Places and history | municipal tourism, national heritage register, official monument or museum | identity, chronology, architecture, access |
| Food | agriculture ministry, official regional cuisine archive, tourism board, producer consortium | ingredients, technique, locality, season |
| Restaurants | local specialist catalog plus official restaurant page | discovery, current branch, recent user signal |
| Shopping | manufacturer, official store, craft association, publisher | model, materials, edition, authenticity |
| Transport | operator, city transit authority, national rail | route, access, passes, operating rules |
| Safety | embassy, police, fire/medical service, national tourism authority | emergency numbers and procedures |
| Images | Wikimedia Commons, Openverse, official press galleries | openly licensed or explicitly reusable media |

Discovery catalogs such as Google Maps, Michelin, HappyCow, Atlas Obscura, local review platforms, Reddit, YouTube, and blogs are lead generators. Confirm consequential claims with a higher-priority source.

## Japan National Sources

| Domain | Source |
|---|---|
| Food overview | [JNTO Gastronomy](https://www.japan.travel/en/gastronomy/) |
| Regional food | [MAFF Our Regional Cuisines](https://www.maff.go.jp/e/policies/market/k_ryouri/index.html) |
| Traditional food | [MAFF Traditional Foods](https://www.maff.go.jp/e/policies/market/dento_syoku/index.html) |
| Rural food culture | [MAFF SAVOR JAPAN](https://www.maff.go.jp/e/policies/rural_dev/savor/index.html) |
| Food etiquette | [JNTO Japanese Food Etiquette](https://www.japan.travel/en/guide/japanese-food-etiquette/) |
| Cultural properties | [Agency for Cultural Affairs](https://www.bunka.go.jp/english/policy/cultural_properties/) |
| Cultural overview | [JNTO Cultural Heritage](https://www.japan.travel/en/guide/japans-cultural-heritage/) |
| Restaurants | [Tabelog English search](https://tabelog.com/en/rstLst.php) |
| Emergencies | [JNTO Emergencies](https://www.japan.travel/en/plan/emergencies/) |
| Disaster safety | [JNTO Safety Tips](https://www.jnto.go.jp/safety-tips/eng/) |

Tabelog is searched by prefecture and category for restaurant candidates, recent ratings, photos, and dish vocabulary. Treat scores as snapshots, preserve the retrieval date, never rank unlike categories mechanically, and verify current opening data on the restaurant's official channel.

## Japan Route Sources

| City or area | Official local sources | Tabelog prefecture |
|---|---|---|
| Osaka | [Osaka Info](https://www.osaka-info.jp/en/osaka/), [food](https://www.osaka-info.jp/en/osaka/food/), [spots](https://www.osaka-info.jp/en/spot/) | [Osaka](https://tabelog.com/en/osaka/rstLst/) |
| Nara | [Visit Nara destinations](https://www.visitnara.jp/destinations/), [see and do](https://www.visitnara.jp/see-and-do/) | [Nara](https://tabelog.com/en/nara/rstLst/) |
| Miyajima | [Miyajima Tourist Association](https://www.miyajima.or.jp/english/) | [Hiroshima](https://tabelog.com/en/hiroshima/rstLst/) |
| Hiroshima | [Dive Hiroshima](https://dive-hiroshima.com/en/), [prefecture food](https://www.pref.hiroshima.lg.jp/site/english/food.html) | [Hiroshima](https://tabelog.com/en/hiroshima/rstLst/) |
| Kyoto | [Kyoto City Official Travel Guide](https://kyoto.travel/en/), [JNTO Kyoto](https://www.japan.travel/en/destinations/kansai/kyoto/) | [Kyoto](https://tabelog.com/en/kyoto/rstLst/) |
| Kanazawa | [attractions](https://visitkanazawa.jp/en/attractions/), [activities](https://visitkanazawa.jp/en/activities/) | [Ishikawa](https://tabelog.com/en/ishikawa/rstLst/) |
| Shirakawa-go | [Shirakawa-go Tourist Association](https://shirakawa-go.gr.jp/en/) | [Gifu](https://tabelog.com/en/gifu/rstLst/) |
| Takayama | [Hida Takayama Official Travel Guide](https://www.hida.jp/english/) | [Gifu](https://tabelog.com/en/gifu/rstLst/) |
| Matsumoto | [Visit Matsumoto](https://visitmatsumoto.com/en/index.html) | [Nagano](https://tabelog.com/en/nagano/rstLst/) |
| Nagano | [Go Nagano](https://www.go-nagano.net/en/) | [Nagano](https://tabelog.com/en/nagano/rstLst/) |
| Tokyo | [GO TOKYO attractions](https://www.gotokyo.org/en/see-and-do/attractions/), [guides](https://www.gotokyo.org/en/story-and-guide/index.html) | [Tokyo](https://tabelog.com/en/tokyo/rstLst/) |

For a new destination, build this same matrix before populating content: one city source, one national authority per domain, one local discovery catalog, and one media strategy.

## Query Recipes

- Places: `site:official-domain place-name history architecture access`
- Food: `site:tourism-or-ministry city regional cuisine dish-name ingredients`
- Experiences: `site:official-city museum workshop activity booking`
- Shopping: `site:manufacturer-or-association product-name model materials limited`
- Local script: search both translated and local names; use the local name for restaurant and image discovery.
- Gaps: compare the official destination index with the guide by neighborhood and category, not only by popularity.

## Writing and Validation

- Anchor each detail in its item's own description and source, then add recognition, sensory or architectural cues, practical use, and local context.
- Do not manufacture dates, superlatives, scarcity, medical claims, opening details, or cultural causality.
- Generate memorable notes from the item's name, material, ingredient, ritual, or visitor behavior. Fail validation when two notes are identical.
- Keep source arrays in runtime data so users can open them from the detail view.
- Recheck time-sensitive claims immediately before publication and store the retrieval date in the research ledger.
