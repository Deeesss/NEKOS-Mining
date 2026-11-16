# NEKOS: SPICE FRONTIER

## Kompletné vývojové zadanie pre Kurumi kóderku

**Verzia:** 1.0\
**Dátum:** 16. november 2026\
**Status:** APPROVED — START DEVELOPMENT\
**Repozitár:** [https://github.com/Deeesss/NEKOS-Mining](https://github.com/Deeesss/NEKOS-Mining)\
**Pracovná vetva:** `feat/nks-rebirth`

**Spresnenie etapy 1:** Emberwell je kolóniové RPG. Po dodávke 500 čistého SPICE môže hráč investovať zásoby do rozšírenia sila. Prvé rozšírenie sprístupní Duskwear pre oboch protagonistov. Profil funguje bez peňaženky. Obchod za internú menu patrí do etapy 2. Existujúci Web3 prototyp sa spúšťa samostatne. Base Sepolia ostáva etapou 3.

---

# 1. Hlavné rozhodnutie

Kurumi, dostávaš schválenie na kompletné oživenie projektu NEKOS Mining.

Pôvodný projekt z roku 2024 prestavujeme na:

**NEKOS: SPICE FRONTIER**

Bude to verejne vyvíjaná sci-fi ekonomická hra, ktorá spája:

- Izometrický pixel-art svet.
- Výber mužského alebo ženského anime protagonistu.
- Správu púštnej kolónie.
- Strategickú mapu púšte.
- Ťažbu SPICE obrovskými harvesterami.
- Spracovanie surového SPICE v rafinériách.
- Skladovanie čistého SPICE v silách.
- Ekonomiku mesta a obchodovanie.
- NPC postavy a príbehové úlohy.
- Ostré HD anime visual novel rozhovory.
- Idle mechaniky a pokračovanie produkcie počas neprítomnosti hráča.
- Skutočnú Web3 integráciu s tokenom $NKS na blockchaine Base.

**Toto nie je plán na ďalší dokument. Toto je schválenie začatia implementácie.**

Najprv preskúmaj existujúci repozitár, urč použiteľné časti a následne začni vytvárať funkčnú hru.

Výsledkom má byť skutočne hrateľný prototyp, nie vizuálny mockup.

# 2. Hlavná herná filozofia

NEKOS má byť v prvom rade príjemná anime sci-fi ekonomická hra.

Hráč musí mať možnosť hrať aj bez kryptopeňaženky.

Blockchain je dodatočná ekonomická vrstva, nie podmienka spustenia hry.

Herný zážitok stojí na troch pilieroch:

**A. Správa kolónie**

Hráč buduje mesto, spravuje ťažobné stroje, spracovanie surovín a ekonomiku.

**B. Anime svet a postavy**

Hráč komunikuje s NPC, získava úlohy, sleduje príbeh a rozhoduje sa v dialógoch.

**C. Web3 ekonomika**

Hráč môže prepojiť svoju hernú aktivitu so samostatným systémom blockchainových odmien.

Nepremieňaj NEKOS na obyčajnú kryptomenovú stránku s tlačidlom Mine.

Vytvor hru, v ktorej existuje skutočná logistika, výroba, zásoby, progres a postavy.

# 3. Grafický a technologický smer

## 3.1 Herný svet

**Schválený vizuál: izometrický 16-bit-inspired pixel art.**

Inšpiráciou sú klasické ekonomické stratégie a moderné pixel-art indie hry.

Požadované vlastnosti:

- Izometrický pohľad na púštne mesto.
- Budovy, vozidlá a malé postavy v pixel-art štýle.
- Pohyb kamery myšou.
- Približovanie a odďaľovanie.
- Klikateľné objekty.
- Vizuálne odlíšiteľné budovy.
- Animácie len tam, kde prinášajú skutočný úžitok.

Grafika má vyzerať ako premyslená hra, nie ako webový administrátorský panel.

## 3.2 Visual novel grafika

Pri rozhovoroch sa vizuálny štýl mení.

**Anime portréty musia byť ostré, vo vysokom rozlíšení, bez pixelovania.**

Každá významná postava môže mať:

- HD portrét alebo ilustráciu postavy.
- Viacero výrazov tváre.
- Samostatnú pózu.
- Vlastné oblečenie.
- Ostré ilustrované pozadie.
- Príbehové CG obrázky.

Pixel-art svet a HD visual novel systém musia byť technicky oddelené vrstvy.

## 3.3 Technológie

Preferovaná architektúra:

| Oblasť          | Technológia                                     |
| --------------- | ----------------------------------------------- |
| 2D herný engine | Phaser                                          |
| Herná logika    | TypeScript                                      |
| UI              | HTML/CSS alebo vhodná komponentová vrstva       |
| Dialógy         | Vlastný dátovo riadený VN systém                |
| Backend         | Existujúci Node.js základ alebo vhodná evolúcia |
| Databáza        | Perzistentná SQL databáza                       |
| Blockchain      | Base                                            |
| Testnet         | Base Sepolia                                    |
| Token           | ERC-20 $NKS                                     |
| Smart kontrakty | Solidity + OpenZeppelin                         |
| Asset pipeline  | Tripo Max + Blender                             |
| Zdrojový kód    | GitHub                                          |

Presné verzie frameworkov vyber podľa aktuálnej kompatibility.

**Three.js nie je potrebný ako hlavný herný engine.**

Zámerne sme zvolili 2D, aby sme znížili náročnosť tvorby prostredia, animácií a optimalizácie.

# 4. Výber protagonistu na začiatku hry

Toto je schválená požiadavka.

Pri prvom spustení hry musí hráč dostať výber medzi dvoma originálnymi protagonistami.

Princíp je podobný výberu Kanteshi v Neverness to Everness.

## Variant A: Mužský protagonista

- Vlastný pixel-art sprite.
- Vlastný HD anime portrét.
- Vlastná prezentácia v dialógoch.
- Možnosť zadať meno.

## Variant B: Ženská protagonistka

- Vlastný pixel-art sprite.
- Vlastný HD anime portrét.
- Vlastná prezentácia v dialógoch.
- Možnosť zadať meno.

Obaja protagonisti absolvujú rovnakú hlavnú príbehovú líniu.

NPC používajú správne meno a príslušné oslovenia.

Zvolený protagonista a meno musia byť uložené v hernom profile.

**Výber protagonistu nesmie byť iba kozmetické tlačidlo, ktoré sa po spustení hry stratí.**

Výber sa musí prejaviť v úvodnej scéne, dialógoch a identite hráča.

Na prvý prototyp možno použiť dočasné ilustrácie. Architektúra musí od začiatku podporovať dva odlišné varianty.

Budúce možnosti:

- Nové oblečenie.
- Kozmetické úpravy.
- Ďalšie výrazy.
- Zmena protagonistu bez straty ekonomického progresu.

Tieto rozšírenia neblokujú prvý prototyp.

# 5. Herný svet: Púštna kolónia

Hráč začína ako nový správca malej púštnej kolónie.

Mesto má vlastné budovy, pracovníkov, logistiku a zásoby.

Na začiatku nepotrebujeme rozsiahly otvorený svet.

**Prvá verzia musí obsahovať jedno malé, funkčné mesto.**

## Povinné budovy

**1. Hlavná základňa**

Centrum kolónie a miesto, kde hráč začína.

**2. Hangár**

Miesto pre parkovanie, správu a vylepšovanie harvesterov.

**3. Rafinéria**

Spracúva surový SPICE na čistý SPICE.

**4. Silo**

Skladuje vyčistený SPICE.

**5. Obchodná stanica**

Pripravuje priestor pre obchodovanie so surovinami a neskoršiu ekonomiku.

**6. Obytná časť**

Prostredie pre NPC a ďalší rozvoj mesta.

Pre prvý vertical slice stačia funkčné hangár, rafinéria, silo a hlavná základňa. Ostatné budovy môžu byť najskôr vizuálnym základom.

## Interakcie

Po kliknutí na budovu sa otvorí jej herný panel.

Napríklad rafinéria zobrazí:

- Množstvo surového SPICE čakajúceho na spracovanie.
- Aktuálnu rýchlosť spracovania.
- Účinnosť rafinérie.
- Aktívnu výrobnú úlohu.
- Množstvo hotového SPICE.
- Možnosti vylepšenia.

Každá budova musí mať jasnú hernú funkciu.

# 6. Dve hlavné herné obrazovky

Toto je dôležitá optimalizácia rozsahu projektu.

**Nebudeme vytvárať jednu obrovskú kontinuálnu 3D mapu.**

Použijeme dva samostatné strategické pohľady.

## A. Mesto

Hráč vidí:

- Kolóniu.
- Budovy.
- NPC postavy.
- Hangár.
- Rafinériu.
- Silá.
- Ekonomické informácie.

Môže sa pohybovať kamerou, vyberať objekty a rozprávať sa s NPC.

## B. Mapa púšte

Samostatná strategická obrazovka zobrazuje:

- Ložiská SPICE.
- Ich polohu a kvalitu.
- Harvesterové expedície.
- Pozície strojov.
- Stav jednotlivých expedícií.
- Priebeh ťažby.
- Množstvo nákladu.
- Prípadné budúce nebezpečenstvá.

Medzi mestom a púštnou mapou môže existovať krátky vizuálny prechod.

Hráč musí mať možnosť kedykoľvek sa vrátiť do mesta bez zastavenia ťažby.

# 7. Harvestery: Základná herná mechanika

Hráč bude disponovať obrovskými sci-fi priemyselnými harvesterami.

Ide o monumentálne pásové alebo viacpodvozkové stroje určené na získavanie SPICE z púštnych ložísk.

Pre produkčné modely použijeme vlastné originálne návrhy vytvorené pomocou Tripo Max.

## Schválený spôsob ťažby

**Samotná ťažba môže prebiehať mimo obrazovky.**

Nie je potrebné animovať všetky mechanické procesy, vrtáky, pásy ani transportné lietadlá.

Hráč vyšle expedíciu a sleduje ju na strategickej mape.

## Kompletný cyklus expedície

1. Hráč otvorí hangár.
2. Vyberie dostupný harvester.
3. Otvorí púštnu mapu.
4. Vyberie ložisko SPICE.
5. Potvrdí vyslanie expedície.
6. Harvester prejde do stavu `TRAVELING`.
7. Po uplynutí času presunu začne `MINING`.
8. Postupne získava surový SPICE.
9. Pri naplnení kapacity alebo na pokyn hráča začne návrat.
10. Po návrate sa náklad odovzdá do zásobníka surovej suroviny.
11. Harvester sa uvoľní pre ďalšiu expedíciu.
12. Hráč môže spustiť spracovanie v rafinérii.

V prvej verzii navrhujem automatický návrat po naplnení kapacity a manuálne tlačidlo na predčasné privolanie.

## Stavový model

Použi explicitné stavy:

- `IDLE`
- `TRAVELING`
- `MINING`
- `RETURNING`
- `UNLOADING`
- `MAINTENANCE` (pripravené pre budúcnosť)

Nepovoľ neplatné prechody.

Napríklad nemožno vyslať stroj, ktorý už ťaží alebo sa vracia.

## Parametre harvestera

Každý harvester bude mať:

- ID.
- Názov.
- Úroveň.
- Kapacitu nákladu.
- Rýchlosť ťažby.
- Rýchlosť presunu.
- Aktuálny stav.
- Aktuálnu expedíciu.
- Množstvo nákladu.

Do budúcnosti priprav rozšíriteľnosť pre odolnosť, poškodenie, spotrebu energie a vylepšenia.

## Vizuálna prezentácia

V meste sa môže zobrazovať veľký sprite harvestera pri hangári.

Na púštnej mape ho reprezentuje ikonka alebo menší sprite.

Po kliknutí na jeho ikonu hráč uvidí napríklad:

**HARVESTER H-01**

Stav: MINING\
Ložisko: Sector A-03\
Náklad: 630 / 1 000\
Postup: 63 %

Čísla musia pochádzať z reálneho herného stavu.

Nepoužívaj náhodne sa meniace frontendové hodnoty, ktoré nie sú napojené na backend.

# 8. Ťažba musí pokračovať na pozadí

NEKOS je čiastočne idle ekonomická hra.

Hráč môže vyslať harvester a následne:

- Otvoriť mesto.
- Rozprávať sa s NPC.
- Spravovať rafinériu.
- Prepnúť na inú obrazovku.
- Zavrieť prehliadač.
- Vrátiť sa neskôr.

**Prebiehajúca expedícia musí zostať zachovaná.**

Backend je autoritou nad výrobnými cyklami.

Čas a množstvo vyťaženej suroviny sa vypočítavajú na základe perzistentne uložených údajov a serverového času.

Nie je potrebné neustále vykonávať náročné animácie alebo frontendové slučky.

Pri opätovnom prihlásení sa zobrazí výsledný stav expedícií.

Zabráň dvojitému pripísaniu odmien po obnovení stránky, výpadku siete alebo reštarte servera.

# 9. Rozdelenie SPICE na dve suroviny

Toto je zásadné rozhodnutie hernej ekonomiky.

**Harvester neťaží hotový čistý SPICE. Ťaží surový SPICE.**

Budeme rozlišovať:

### RAW SPICE

Surový materiál získaný z púštneho ložiska.

Obsahuje nečistoty a musí sa spracovať.

### REFINED SPICE

Vyčistený a spracovaný SPICE.

Je to hotová obchodovateľná herná surovina.

**Do finálnych síl sa ukladá REFINED SPICE.**

Surový SPICE sa po vyložení uskladní vo vstupnom zásobníku rafinérie alebo v príslušnom sklade suroviny.

Tieto dva typy zásob musia existovať oddelene v dátovom modeli.

# 10. Rafinéria

Rafinéria premieňa RAW SPICE na REFINED SPICE.

## Základné parametre

- Kapacita vstupného zásobníka.
- Rýchlosť spracovania.
- Účinnosť.
- Aktuálna výrobná úloha.
- Výstupný objem čistého SPICE.
- Úroveň rafinérie.

## Príklad hernej logiky

Pre testovanie možno použiť tieto konfigurovateľné hodnoty:

- 1 000 jednotiek RAW SPICE.
- Účinnosť 70 %.
- Výstup 700 jednotiek REFINED SPICE.
- Zvyšok predstavuje odpad a nečistoty.

Tieto hodnoty sú pracovným balansom, nie konečnými ekonomickými parametrami.

Spracovanie musí trvať definovaný herný čas.

Hráč má vidieť progres výroby.

Výsledné množstvá sa počítajú na backende.

## Vylepšenia

Neskoršie úrovne môžu zvýšiť:

- Rýchlosť spracovania.
- Účinnosť.
- Kapacitu.
- Počet paralelných výrobných úloh.

Prvý vertical slice potrebuje jednu funkčnú rafinériu.

# 11. Silá a skladovanie

Silo je finálny sklad pre čistý SPICE.

## Silo musí evidovať

- Celkovú kapacitu.
- Aktuálne zásoby REFINED SPICE.
- Dostupné voľné miesto.
- Históriu príjmov a výdajov.

Hráč môže postaviť ďalšie silá alebo vylepšovať existujúce.

Keď je silo plné, ďalšia produkcia nesmie potichu zmiznúť.

Systém má pozastaviť odovzdanie alebo ponechať výstup v bezpečnom výrobnom zásobníku.

Každá zmena zásob musí byť konzistentná a overiteľná.

# 12. Ekonomika a rozvoj kolónie

Ekonomika musí mať funkčný interný herný model.

Základné zdroje:

1. RAW SPICE.
2. REFINED SPICE.
3. Interná herná mena na obchodovanie a výstavbu.
4. NKS ako samostatný blockchainový token.

Výšku cien, produkčných nákladov a ekonomických kurzov určuj ako konfigurovateľné parametre.

## Hráč má vedieť

- Predávať spracovaný SPICE za internú hernú menu.
- Použiť menu na vylepšenia.
- Vylepšovať harvestery.
- Zvyšovať kapacitu výroby.
- Rozširovať skladovanie.
- Odomykať ďalšie expedície.

Prvá etapa používa priamu investíciu čistého SPICE do zvýšenia kapacity sila. Prvý obchod s definovanou cenou patrí do etapy 2.

Pokročilý dynamický trh, kontrakty medzi hráčmi a burza patria do ďalších etáp.

# 13. NPC postavy a anime svet

Kolónia musí pôsobiť obývane.

NPC nebudú iba dekoráciou.

Každá významná postava môže mať:

- Meno.
- Rolu.
- Pixel-art sprite.
- HD anime portrét.
- Výrazy tváre.
- Dialógy.
- Príbehové úlohy.
- Stav vzťahu s hráčom, ak to bude neskôr potrebné.

## Navrhované prvé postavy

**Veliteľka ťažobných operácií**

Vysvetľuje fungovanie expedícií, harvesterov a ložísk.

**Technik**

Spravuje údržbu a vylepšenia strojov.

**Operátorka rafinérie**

Vysvetľuje spracovanie RAW SPICE na REFINED SPICE.

**Obchodník**

Zabezpečuje predaj, nákup a obchodné kontrakty.

**Správca sila**

Poskytuje informácie o zásobách a kapacitách.

Toto sú navrhované roly, nie uzamknuté mená či finálne dizajny.

Na prvý vertical slice stačí jedna plne funkčná NPC postava a rozšíriteľný systém pre ďalšie.

# 14. Visual novel systém

Toto je jedna z hlavných vizuálnych identít projektu.

Po kliknutí na významnú NPC sa otvorí HD visual novel scéna.

Herný svet môže zostať na pozadí alebo sa môže nahradiť ilustrovaným prostredím.

## Povinné prvky

- HD portrét postavy.
- Meno hovoriacej postavy.
- Textové dialógové okno.
- Postupné zobrazovanie textu.
- Tlačidlo pokračovania.
- Možnosti odpovedí.
- Prepínanie výrazov tváre.
- Možnosť zatvoriť dialóg.
- Reakcia na meno a variant protagonistu.
- Možnosť spustiť hernú úlohu alebo zmeniť stav hry.

## Architektúra dialógov

Dialógy majú byť definované dátovo, nie jednotlivo natvrdo implementované v UI.

Každý dialógový uzol môže obsahovať:

- Identifikátor.
- ID postavy.
- Text.
- Výraz tváre.
- Pozadie.
- Možnosti odpovedí.
- Podmienky zobrazenia.
- Nasledujúci uzol.
- Hernú akciu.

Systém musí umožniť neskoršie pridávanie ďalších postáv a príbehov.

## Grafické pravidlá

Pixel-art svet používa vlastné škálovanie a vhodné filtrovanie.

HD portréty a ilustrácie sa vykresľujú samostatne vo vysokom rozlíšení.

Nepoužívaj globálny pixel-art filter na visual novel vrstvu.

# 15. Úvodná príbehová sekvencia

Prvý štart hry:

**NEKOS: SPICE FRONTIER**

Hráč si vyberie mužského alebo ženského protagonistu.

Zadá meno.

Nasleduje krátka úvodná visual novel scéna.

Veliteľka ťažobných operácií privíta hráča v malej púštnej kolónii.

Kolónia je v zlom ekonomickom stave.

Má jediný starší harvester, základnú rafinériu a takmer prázdne silá.

Hráč dostane prvú úlohu:

**Dopraviť 500 jednotiek REFINED SPICE do mestského sila.**

Úloha hráča postupne naučí:

1. Otvoriť hangár.
2. Vybrať harvester.
3. Prejsť na púštnu mapu.
4. Vybrať ložisko.
5. Vyslať expedíciu.
6. Počkať na vyťaženie a návrat suroviny.
7. Spracovať RAW SPICE v rafinérii.
8. Uložiť hotový SPICE do sila.
9. Vrátiť sa k veliteľke.
10. Prevziať odmenu a dokončiť prvú úlohu.

Toto má byť prvý kompletný hrateľný príbehový a ekonomický cyklus.

# 16. Tripo Max a grafická produkcia

Máme existujúci Tripo Max účet a približne 20 000 dostupných tokenov podľa posledného stavu.

Tento zdroj chceme aktívne využívať.

**Nepoužívaj platené Tripo API.**

Nevytváraj nové platené závislosti.

## Použitie Tripo

Tripo je určené na produkciu 3D predlôh pre:

- Harvestery.
- Transportné lietadlá.
- Budovy.
- Rafinérie.
- Silá.
- Vozidlá.
- Technické zariadenia.
- Ďalšie priemyselné objekty.

## Asset pipeline

**Tripo → GLB/glTF → Blender → ortografický render → sprity/spritesheet → Phaser**

Zabezpeč:

- Konzistentnú izometrickú projekciu.
- Zjednotenú mierku.
- Jednotný pixel-art štýl.
- Stabilné rozmery spritesheetov.
- Priehľadné pozadie sprite assetov.
- Rozumnú kompresiu a správu textúr.

Originálne 3D modely zachovaj ako zdrojové podklady.

Pre prvý prototyp používaj dočasné originálne assety. Vývoj nesmie stáť na tom, že zatiaľ nemáme hotový model harvestera.

HD anime portréty sú oddelenou grafickou kategóriou.

# 17. Web3 integrácia

NEKOS bude mať vlastný blockchainový token.

**Názov:** NEKOS SPICE\
**Symbol:** NKS\
**Blockchain:** Base\
**Prvý deployment:** Base Sepolia\
**Štandard:** ERC-20

## Zásadné rozlíšenie

RAW SPICE nie je kryptomena.

REFINED SPICE nie je automaticky kryptomena.

**$NKS je samostatný on-chain token.**

Herná ekonomika musí fungovať nezávisle od blockchainu.

Web3 vrstva pracuje s oprávnenými odmenami, ktoré vznikajú podľa vopred schválených pravidiel.

Nepovoľ automatické neobmedzené mintovanie $NKS iba preto, že hráč dokáže opakovane ťažiť SPICE.

## Wallet systém

Implementovať:

- Pripojenie EVM peňaženky.
- Overenie vlastníctva adresy podpisom s jednorazovým nonce.
- Bezpečné priradenie peňaženky k hernému účtu.
- Zobrazenie adresy a siete.
- Zobrazenie NKS zostatku.
- Rozhranie pre claim.
- Zobrazenie stavu transakcie.
- Odkaz na blockchain explorer.

Hráč nemusí pripájať wallet pri prvom spustení.

## Smart kontrakty

Použi etablované OpenZeppelin implementácie.

Na Base Sepolia vytvor:

**A. NKS token**

ERC-20 s pevnou testovacou zásobou.

**B. Reward Distributor**

Samostatný kontrakt vyplácajúci odmeny z vopred financovaného tokenového zostatku.

Autorizácia claimu musí byť podpísaná oprávneným signerom, ideálne pomocou EIP-712.

Musí byť viazaná na:

- Adresu príjemcu.
- Množstvo tokenov.
- Jedinečný nonce alebo identifikátor odmeny.
- Expiráciu.
- Konkrétny kontrakt.
- Konkrétny chain ID.

Chrániť pred replay útokmi, duplicitným claimom a neoprávneným čerpaním.

Neukladať súkromné kľúče používateľov.

## Tokenomika

Zatiaľ nie je schválené:

- Produkčná celková zásoba.
- Emisný model.
- Konverzný pomer SPICE na NKS.
- Distribúcia tokenov.
- Ekonomika predaja.
- DEX likvidita.
- Mainnet launch.

Priprav konfigurovateľný návrh v `TOKENOMICS.md`.

Na testnete možno používať jednoznačne označené testovacie hodnoty.

**Prvý skutočný blockchainový cieľ: úspešne vyzdvihnúť NKS na Base Sepolia a overiť transakciu na exploreri.**

# 18. Backend a perzistencia

Herný backend musí byť autoritou pre:

- Hráčske profily.
- Výber protagonistu.
- Budovy.
- Inventár.
- Harvestery.
- Expedície.
- Rafináciu.
- Silá.
- Úlohy.
- Odmeny.
- Web3 claimy.

Nevytváraj ekonomiku riadenú výhradne JavaScriptom v prehliadači.

## Navrhované dátové entity

- `players`
- `player_profiles`
- `colonies`
- `buildings`
- `harvesters`
- `spice_deposits`
- `expeditions`
- `refinery_jobs`
- `inventories`
- `inventory_ledger`
- `quests`
- `quest_progress`
- `npc_dialogue_state`
- `wallet_links`
- `reward_claims`
- `blockchain_transactions`

Toto je orientačné rozdelenie, nie požiadavka vytvoriť presne tieto tabuľky bez posúdenia existujúceho systému.

## Pravidlá integrity

Každá herná operácia musí byť serverovo overovaná.

Zmeny surovín majú byť atomické.

Rovnaká expedícia nemôže dvakrát vyložiť identický náklad.

Rovnaká výrobná úloha nemôže dvakrát vyprodukovať rovnaký SPICE.

Nesmie sa dať prekročiť kapacita sila.

Po reštarte backendu musí byť možné správne obnoviť herný stav.

História ekonomických operácií musí byť dohľadateľná.

# 19. Verejný vývoj a licencia

Projekt sa bude vyvíjať verejne na GitHube.

## Licencia

- MIT pre vlastný zdrojový kód.
- Samostatne vyhradené práva pre originálne grafické assety, postavy a branding.
- Overiť licencie použitých externých podkladov.

Pripraviť:

- `LICENSE`
- `ASSETS_LICENSE.md`
- `README.md`
- `.env.example`
- `.gitignore`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `TOKENOMICS.md`

## Bezpečnostná kontrola existujúceho projektu

V predchádzajúcom review sa objavili indikácie, že pôvodný repozitár obsahoval zverejnené tajné údaje.

Over skutočný stav.

Identifikuj API kľúče, Telegram tokeny a ďalšie credentials.

Nevypisuj ich hodnoty do reportov, commitov ani PR.

Označ kompromitované údaje vyžadujúce rotáciu.

Odstráň ich z aktuálneho kódu a oddeľ konfiguráciu do bezpečného prostredia.

Históriu Gitu neprepisuj bez schválenia vlastníka.

# 20. Čo zachovať z pôvodného NEKOS

Najprv vykonaj audit pôvodného repozitára.

Preskúmaj:

- Frontend.
- Existujúce API.
- Herné mechaniky.
- Staré ťažobné funkcie.
- Telegram bota.
- Databázovú vrstvu.
- Existujúce assety.
- Build proces.
- Testy.
- Git históriu.

Urči, ktoré časti majú reálnu hodnotu.

Zachovaj použiteľnú logiku a assety.

Pôvodný kód môžeš nahradiť tam, kde je to potrebné pre novú architektúru, bezpečnosť alebo udržateľnosť.

Nerob však slepý kompletný rewrite iba preto, že ide o starý projekt.

# 21. Rozdelenie vývoja na etapy

## ETAPA 0 — Repo Recovery

Cieľ: dostať pôvodný projekt do reprodukovateľného technického stavu.

Výsledky:

- Inventár repozitára.
- Identifikované použiteľné časti.
- Bezpečne oddelená konfigurácia.
- Funkčný vývojový setup.
- Nová pracovná vetva.
- Základ automatizovaných testov.

Pokračuj priamo implementáciou. Nepotrebuješ vytvárať rozsiahly analytický dokument.

## ETAPA 1 — Playable Vertical Slice

Toto je okamžitá priorita.

Dodať:

1. Spustiteľnú Phaser aplikáciu.
2. Úvodné menu.
3. Výber mužského alebo ženského protagonistu.
4. Zadanie a uloženie mena.
5. Malú izometrickú kolóniu.
6. Kameru s pohybom a zoomom.
7. Jednu NPC postavu.
8. HD anime visual novel dialóg.
9. Hangár s harvesterom.
10. Púštnu strategickú mapu.
11. Jedno ložisko SPICE.
12. Vyslanie harvestera.
13. Ťažbu mimo obrazovky.
14. Návrat a vyloženie RAW SPICE.
15. Funkčnú rafinériu.
16. Spracovanie na REFINED SPICE.
17. Silo.
18. Prvú úlohu s cieľom 500 jednotiek REFINED SPICE.
19. Perzistentné uloženie stavu.
20. Automatizované testy ekonomického cyklu.
21. Prvé rozšírenie mesta za REFINED SPICE a zmena odomknutého outfitu vo veliteľstve.

**Výsledok:** hráč prejde celú prvú misiu od výberu postavy až po uloženie čistého SPICE do sila.

## ETAPA 2 — Living Colony

Rozšíriť:

- Počet NPC.
- Dialógy.
- Budovy.
- Harvesterové vylepšenia.
- Obchodovanie.
- Pracovníkov.
- Viaceré ložiská.
- Viaceré expedície.
- Ekonomické balansovanie.
- Príbehové misie.
- Produkčné pixel-art assety.

Pripraviť podporu pre kvalitnejšie anime ilustrácie a komplexnejšie rozhovory.

## ETAPA 3 — Web3 Testnet

Dodať:

- Wallet connection.
- Podpisové prihlásenie.
- Base Sepolia integráciu.
- NKS ERC-20 kontrakt.
- Reward Distributor.
- Backendové oprávnenia na claim.
- Prvý funkčný claim.
- Overenie zostatku tokenov.
- Blockchain explorer.
- Automatizované smart contract testy.

Web3 vývoj môže prebiehať paralelne, ak to nenaruší dodanie hrateľného základu.

## ETAPA 4 — Rozšírenie sveta

Budúce možnosti:

- Púštne červy.
- Rizikové ťažobné sektory.
- Poruchy a poškodenie harvesterov.
- Transportné lietadlá.
- Špeciálne expedície.
- Nové kolónie.
- Obchodné frakcie.
- NPC vzťahy.
- Väčšie príbehové línie.
- Pokročilý trh.
- Multiplayer alebo obchodovanie medzi hráčmi.

Tieto funkcie patria do roadmapy, nie medzi blokery prvého vertical slice.

# 22. Automatizované testovanie

Vyžadujem testy hernej logiky, nielen screenshot funkčného frontendového rozhrania.

## Herné scenáre

- Vytvorenie profilu.
- Výber oboch protagonistov.
- Uloženie a načítanie mena.
- Otvorenie dialógu.
- Spustenie úlohy.
- Vyslanie harvestera.
- Odmietnutie duplicitného vyslania.
- Dokončenie ťažby.
- Správny výpočet RAW SPICE.
- Správny návrat.
- Jednorazové vyloženie nákladu.
- Rafinácia.
- Výpočet REFINED SPICE.
- Kontrola kapacity sila.
- Dokončenie prvej misie.
- Obnova stavu po reštarte.
- Pokračovanie expedície po zatvorení prehliadača.

## Blockchainové scenáre

- Pripojenie správnej siete.
- Odmietnutie neplatného podpisu.
- Platný claim.
- Duplicitný claim.
- Expirovaný claim.
- Nesprávny príjemca.
- Nesprávny chain ID.
- Nedostatočný zostatok distribučného kontraktu.
- Obnovenie stavu po neúspešnej transakcii.

Netvrď, že je test úspešný, ak nebol skutočne vykonaný.

# 23. Požiadavky na UX

NEKOS nesmie pôsobiť ako technická ukážka blockchainu.

Hráč má vidieť hru.

Nie súbor administračných formulárov.

Požadujem:

- Čitateľné herné menu.
- Jednoduché ovládanie myšou.
- Peknú izometrickú scénu.
- Zrozumiteľné ikony harvesterov.
- Prehľadný inventár.
- Jasné výrobné ukazovatele.
- Plynulé prechody medzi mestom a mapou.
- Príjemné HD dialógové rozhranie.
- Funkčnosť pri bežných desktopových rozlíšeniach.
- Žiadne povinné pripájanie wallet pred začiatkom hrania.

Vizuálnym cieľom je skutočná anime sci-fi stratégia s modernou prezentáciou, nie technologický dashboard.

# 24. Otvorené rozhodnutia

Tieto parametre zatiaľ nie sú schválené a nesmú blokovať základný vývoj:

- Finálne mená protagonistov.
- Dizajny významných NPC.
- Presný počet herných budov.
- Finálne rýchlosti ťažby.
- Ekonomické ceny a balans.
- Finálne kapacity strojov.
- Finálna účinnosť rafinérií.
- Počet herných regiónov.
- Token supply a produkčná tokenomika.
- Produkčný spôsob distribúcie $NKS.
- Produkčné Web3 ekonomické pravidlá.

Na implementáciu vertical slice používaj jasne označené a konfigurovateľné vývojové hodnoty.

Neuzamykaj tieto rozhodnutia do architektúry.

# 25. Odovzdanie

Po dokončení prvej etapy chcem:

**A. Funkčný prototyp**

Lokálne spustiteľnú hru.

**B. Zdrojový kód**

Commity vo vetve `feat/nks-rebirth` a PR na review, bez automatického merge.

**C. Dôkaz funkčnosti**

Screenshoty alebo krátke záznamy:

- Výber protagonistu.
- Mesto.
- Púštna mapa.
- Harvester na expedícii.
- Rafinéria.
- Silo.
- HD visual novel dialóg.

**D. Testy**

Presné vykonané testy a výsledky.

**E. Asset pipeline**

Zoznam pripravených assetov a tých, ktoré budeme následne vytvárať cez Tripo.

**F. Technický handoff**

Napíš priamo do správy:

- Čo je hotové.
- Čo skutočne funguje.
- Čo zostáva.
- Aké rozhodnutia si prijala.
- Ako sa projekt spúšťa.
- Aký je ďalší implementačný krok.

Nepoužívaj ZIP ako jediný spôsob odovzdania informácií.

# 26. Finálne realizačné pokyny

Kurumi, máme schválený smer.

Začni od prototypu v Deeesss/NEKOS-Mining. Repozitár z roku 2024 je historický zdroj.

Zameraj sa na fungujúcu hru.

Priorita je:

**Výber protagonistu → mesto → NPC rozhovor → vyslanie harvestera → púštna mapa → RAW SPICE → rafinéria → REFINED SPICE → silo → splnenie misie.**

Následne dokončíme prepojenie na Base Sepolia a prvú funkčnú NKS blockchainovú odmenu.

Nepotrebujeme plne animovanú ťažbu ani kompletný otvorený svet.

Nepotrebujeme nový 3D engine.

Nepotrebujeme produkčné Tripo assety pred prvým spustiteľným prototypom.

Potrebujeme funkčný, rozšíriteľný, vizuálne príjemný základ hry, ktorú budeme môcť verejne ukazovať a postupne rozvíjať.

**Rozhodnutie vlastníka: NEKOS REBIRTH JE SCHVÁLENÝ. ZAČNI IMPLEMENTÁCIU.**

*Welcome to the Spice Frontier.*
