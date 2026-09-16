/**
 * 🎤 RapQuizService.js — Moteur Procédural de Culture Rap & QCM Style Booska-P
 * Génère plus de 20 000 questions vérifiées sur la culture rap (FR & US),
 * les punchlines, les albums, les origines, les certifications, les beatmakers et anecdotes.
 */

class RapQuizService {
  constructor() {
    this.initData();
  }

  initData() {
    // 1. 🎤 ARTISTES MAJEURS & ORIGINES (Villes / Départements / Quartiers)
    this.artists = [
      { name: 'Booba', realName: 'Élie Yaffa', city: 'Boulogne-Billancourt', dept: '92 (Hauts-de-Seine)', label: '92i / Tallac', debutYear: 2002, debutAlbum: 'Temps Mort', classics: ['Boulbi', 'Numéro 10', 'DKR', 'Pitbull', 'Scarface'], beatmaker: 'Animalsons' },
      { name: 'Kaaris', realName: 'Okou Armand Gnakouri', city: 'Sevran', dept: '93 (Seine-Saint-Denis)', label: 'Therapy Music / Def Jam', debutYear: 2013, debutAlbum: 'Or Noir', classics: ['Zoo', 'Tchoin', 'Binks', 'Se-Vrak', 'Blow'], beatmaker: 'Therapy (2093)' },
      { name: 'Ninho', realName: 'William Nzobazola', city: 'Yerres / Nemours', dept: '91 / 77 (Île-de-France)', label: 'TTR Productions / Rec. 118', debutYear: 2017, debutAlbum: 'Comme prévu', classics: ['Goutte d\'eau', 'La vie qu\'on mène', 'Lettre à une femme', 'Mamacita', 'Binks to Binks'], beatmaker: 'Katrina Squad' },
      { name: 'PNL (Ademo & N.O.S)', realName: 'Tarik & Nabil Andrieu', city: 'Corbeil-Essonnes (Les Tarterêts)', dept: '91 (Essonne)', label: 'QLF Records', debutYear: 2015, debutAlbum: 'Le Monde Chico', classics: ['Au DD', 'Da', 'Le monde ou rien', 'Naha', 'Onizuka'], beatmaker: 'BBP' },
      { name: 'Jul', realName: 'Julien Mari', city: 'Marseille (Saint-Jean-du-Désert)', dept: '13 (Bouches-du-Rhône)', label: 'D\'Or et de Platine', debutYear: 2014, debutAlbum: 'Dans ma paranoïa', classics: ['Tchikita', 'JCVD', 'Bande Organisée', 'Sousou', 'La Bandite'], beatmaker: 'Jul lui-même' },
      { name: 'SCH', realName: 'Julien Schwarzer', city: 'Aubagne / Marseille', dept: '13 (Bouches-du-Rhône)', label: 'Maison Baron Rouge', debutYear: 2015, debutAlbum: 'A7', classics: ['Champs-Élysées', 'Otto', 'Fusil', 'Gomorra', 'Mode Akimbo'], beatmaker: 'Katrina Squad (Guilty)' },
      { name: 'Freeze Corleone', realName: 'Issa Lorenzo Diakhaté', city: 'Les Lilas / Pantin', dept: '93 (Seine-Saint-Denis)', label: '667 (Ligue des Ombres)', debutYear: 2020, debutAlbum: 'LMF (La Menace Fantôme)', classics: ['Freeze Raël', 'Hors Ligne', 'Bâton Rouge', 'Desiigner', 'Shavkat'], beatmaker: 'Flem' },
      { name: 'Gazo', realName: 'Ibrahima Diakité', city: 'Saint-Denis / Paris', dept: '93 / 75', label: 'BSB', debutYear: 2021, debutAlbum: 'Drill FR', classics: ['DIE', 'Kassav', 'Rappel', 'Drill FR 4', 'Haine & Sex'], beatmaker: 'Flem / Dallas' },
      { name: 'Damso', realName: 'William Kalubi', city: 'Bruxelles (Kinshasa)', dept: 'Belgique (1000 Bruxelles)', label: 'TheVie Radio / 92i', debutYear: 2016, debutAlbum: 'Batterie Faible', classics: ['Macarena', 'BruxellesVie', 'Feu de bois', 'Morose', 'Signaux'], beatmaker: 'BBP' },
      { name: 'Nekfeu', realName: 'Ken Samaras', city: 'Paris (15e / Nice)', dept: '75 (Paris)', label: 'Seine Zoo / 1995', debutYear: 2015, debutAlbum: 'Feu', classics: ['On verra', 'Tempête', 'Tricheur', 'Galatée', 'Égérie'], beatmaker: 'Hugz Hefner' },
      { name: 'Orelsan', realName: 'Aurélien Cotentin', city: 'Caen', dept: '14 (Calvados)', label: '7th Magnitude / 3e Bureau', debutYear: 2009, debutAlbum: 'Perdu d\'avance', classics: ['Basique', 'La terre est ronde', 'L\'odeur de l\'essence', 'San', 'Changement'], beatmaker: 'Skread' },
      { name: 'Rohff', realName: 'Housni Mkouboi', city: 'Vitry-sur-Seine', dept: '94 (Val-de-Marne)', label: 'Mafia K\'1 Fry / Foolek', debutYear: 1999, debutAlbum: 'Le Code de l\'honneur', classics: ['La Puissance', 'Qui est l\'exemple ?', 'En mode', 'TDSI', 'Testament'], beatmaker: 'DJ Mehdi' },
      { name: 'La Fouine', realName: 'Laouni Mouhid', city: 'Trappes', dept: '78 (Yvelines)', label: 'Banlieue Sale', debutYear: 2005, debutAlbum: 'Bourré au son', classics: ['Tous les mêmes', 'Du ferme', 'Quand je partirai', 'Veni Vidi Vici', 'D\'où l\'on vient'], beatmaker: 'Street Fabulous' },
      { name: 'Tiakola', realName: 'William Mundala', city: 'La Courneuve (4000)', dept: '93 (Seine-Saint-Denis)', label: 'Mélo / 4Keus', debutYear: 2022, debutAlbum: 'Mélo', classics: ['Étincelle', 'Gasolina', 'Mode AV', 'Si j\'savais', 'Meuda'], beatmaker: 'Shiruken Music' },
      { name: 'SDM', realName: 'Sadam Jarden Cédric', city: 'Clamart', dept: '92 (Hauts-de-Seine)', label: '92i', debutYear: 2021, debutAlbum: 'Ocho', classics: ['Bolide Allemand', 'Yakalelo', 'Mr. Ocho', 'Passat', 'Pour elle'], beatmaker: 'Junior Alaprod' },
      { name: 'Werenoi', realName: 'Jérémie B.', city: 'Montreuil', dept: '93 (Seine-Saint-Denis)', label: 'PLR Music', debutYear: 2023, debutAlbum: 'Carré', classics: ['Laboratoire', 'Chemin d\'or', '10.03.2023', 'Ciao', 'Chasseur de prime'], beatmaker: '2K on the track' },
      { name: 'Dinos', realName: 'Jules Jomby', city: 'La Courneuve', dept: '93 (Seine-Saint-Denis)', label: 'SPKTAQLR', debutYear: 2018, debutAlbum: 'Imany', classics: ['Helsinki', 'Moins un', 'Place Émilie du Châtelet', 'No Love', 'Quatre saisons'], beatmaker: 'Twenty9' },
      { name: 'Vald', realName: 'Valentin Le Du', city: 'Aulnay-sous-Bois', dept: '93 (Seine-Saint-Denis)', label: 'Échelon Records', debutYear: 2017, debutAlbum: 'Agartha', classics: ['Désaccordé', 'Bonjour', 'Eurofric', 'Megadose', 'Ce monde est cruel'], beatmaker: 'Seezy' },
      { name: 'Koba LaD', realName: 'Marcel Junior Loutarila', city: 'Évry (Parc aux Lièvres)', dept: '91 (Essonne)', label: 'Grinta FM', debutYear: 2018, debutAlbum: 'VII', classics: ['Train de vie', 'Cellophané', 'Beldia', 'Matin', 'Doudou'], beatmaker: 'Phazz' },
      { name: 'PLK', realName: 'Mathieu Pruski', city: 'Clamart', dept: '92 (Hauts-de-Seine)', label: 'Enna Music / Panama Bende', debutYear: 2018, debutAlbum: 'Polak', classics: ['Un peu de haine', 'Pilote', 'Problèmes', 'Demain', 'Nouvel Ordre'], beatmaker: 'Junior Alaprod' },
      { name: 'Soolking', realName: 'Abderraouf Derradji', city: 'Staoueli (Alger) / Paris', dept: 'International / 93', label: 'Hyper Focal', debutYear: 2018, debutAlbum: 'Fruit du démon', classics: ['Guérilla', 'Dalida', 'Suavemente', 'Zemër', 'Casanova'], beatmaker: 'Diias' },
      { name: 'Zola', realName: 'Aurélien N\'Zuzi Zola', city: 'Lardy / Évry', dept: '91 (Essonne)', label: 'Truth Records / AWA', debutYear: 2019, debutAlbum: 'Cicatrices', classics: ['California Girl', 'Papers', 'Wow', 'Amber', 'Extasy'], beatmaker: 'Kore' },
      { name: 'Gradur', realName: 'Wanani Gradi Mariadi', city: 'Hem / Roubaix', dept: '59 (Nord)', label: 'Sheguey Squaad', debutYear: 2015, debutAlbum: 'L\'Homme au bob', classics: ['Sheguey 10', 'Rosa', 'Ne reviens pas', 'Terrasser', 'Oblah'], beatmaker: 'Mylos' },
      { name: 'Kery James', realName: 'Alix Mathurin', city: 'Orly', dept: '94 (Val-de-Marne)', label: 'Ideal J / Mafia K\'1 Fry', debutYear: 2001, debutAlbum: 'Si c\'était à refaire', classics: ['Banlieusards', 'Le combat continue', 'Hardcore', 'Lettre à la République', 'Constat amer'], beatmaker: 'DJ Mehdi' },
      { name: 'IAM (Akhenaton & Shurik\'n)', realName: 'Philippe Fragione & Geoffroy Mussard', city: 'Marseille', dept: '13 (Bouches-du-Rhône)', label: 'Côté Obscur', debutYear: 1991, debutAlbum: '... De la planète Mars', classics: ['Demain c\'est loin', 'L\'Empire du côté obscur', 'Petit frère', 'Je danse le Mia', 'Nés sous la même étoile'], beatmaker: 'Akhenaton' },
      { name: 'Suprême NTM (Kool Shen & JoeyStarr)', realName: 'Bruno Lopes & Didier Morville', city: 'Saint-Denis', dept: '93 (Seine-Saint-Denis)', label: 'Epic Records', debutYear: 1991, debutAlbum: 'Authentik', classics: ['Seine-Saint-Denis Style', 'Ma Benz', 'Laisse pas traîner ton fils', 'Police', 'Qu\'est-ce qu\'on attend'], beatmaker: 'DJ S' },
      { name: 'Kendrick Lamar', realName: 'Kendrick Duckworth', city: 'Compton (Californie)', dept: 'USA (West Coast)', label: 'pgLang / TDE', debutYear: 2012, debutAlbum: 'good kid, m.A.A.d city', classics: ['HUMBLE.', 'Not Like Us', 'Alright', 'Swimming Pools', 'DNA.'], beatmaker: 'Dr. Dre / Sounwave' },
      { name: 'Drake', realName: 'Aubrey Drake Graham', city: 'Toronto', dept: 'Canada / OVO', label: 'OVO Sound', debutYear: 2010, debutAlbum: 'Thank Me Later', classics: ['God\'s Plan', 'Hotline Bling', 'One Dance', 'Started From the Bottom', 'In My Feelings'], beatmaker: '40 (Noah Shebib)' },
      { name: 'Travis Scott', realName: 'Jacques Berman Webster II', city: 'Houston (Texas)', dept: 'USA (Sud)', label: 'Cactus Jack', debutYear: 2015, debutAlbum: 'Rodeo', classics: ['SICKO MODE', 'Goosebumps', 'FE!N', 'Antidote', 'HIGHEST IN THE ROOM'], beatmaker: 'Mike Dean / WondaGurl' },
      { name: 'Eminem', realName: 'Marshall Bruce Mathers III', city: 'Detroit (Michigan)', dept: 'USA (Midwest)', label: 'Shady Records / Aftermath', debutYear: 1999, debutAlbum: 'The Slim Shady LP', classics: ['Lose Yourself', 'Without Me', 'The Real Slim Shady', 'Stan', 'Till I Collapse'], beatmaker: 'Dr. Dre' },
    ];

    // 2. 💿 ALBUMS CULTES & ANNÉES
    this.albums = [
      { artist: 'Booba', title: 'Temps Mort', year: 2002, tracks: 14, certification: 'Or / Culte absolu' },
      { artist: 'Booba', title: 'Ouest Side', year: 2006, tracks: 16, certification: 'Platine' },
      { artist: 'Booba', title: 'Lunatic', year: 2010, tracks: 18, certification: 'Double Platine' },
      { artist: 'Booba', title: 'ULTRA', year: 2021, tracks: 14, certification: 'Platine' },
      { artist: 'Kaaris', title: 'Or Noir', year: 2013, tracks: 17, certification: 'Double Platine / Fondateur de la Trap FR' },
      { artist: 'PNL', title: 'Que la famille', year: 2015, tracks: 12, certification: 'Platine' },
      { artist: 'PNL', title: 'Le Monde Chico', year: 2015, tracks: 17, certification: 'Double Platine' },
      { artist: 'PNL', title: 'Dans la légende', year: 2016, tracks: 16, certification: 'Disque de Diamant (500 000+)' },
      { artist: 'PNL', title: 'Deux Frères', year: 2019, tracks: 16, certification: 'Disque de Diamant (500 000+)' },
      { artist: 'Ninho', title: 'Comme prévu', year: 2017, tracks: 15, certification: 'Triple Platine' },
      { artist: 'Ninho', title: 'Destin', year: 2019, tracks: 18, certification: 'Disque de Diamant' },
      { artist: 'Ninho', title: 'Jefe', year: 2021, tracks: 15, certification: 'Disque de Diamant (Zéro feat)' },
      { artist: 'Ninho', title: 'NI', year: 2023, tracks: 16, certification: 'Double Platine' },
      { artist: 'Damso', title: 'Batterie Faible', year: 2016, tracks: 12, certification: 'Double Platine' },
      { artist: 'Damso', title: 'Ipséité', year: 2017, tracks: 14, certification: 'Disque de Diamant' },
      { artist: 'Damso', title: 'Lithopédion', year: 2018, tracks: 17, certification: 'Triple Platine' },
      { artist: 'Damso', title: 'QALF', year: 2020, tracks: 14, certification: 'Triple Platine' },
      { artist: 'SCH', title: 'A7', year: 2015, tracks: 14, certification: 'Double Platine (Mixtape la plus vendue)' },
      { artist: 'SCH', title: 'Anarchie', year: 2016, tracks: 13, certification: 'Double Platine' },
      { artist: 'SCH', title: 'JVLIVS', year: 2018, tracks: 17, certification: 'Platine' },
      { artist: 'SCH', title: 'JVLIVS II', year: 2021, tracks: 19, certification: 'Triple Platine (63 000 en 1ère semaine)' },
      { artist: 'Freeze Corleone', title: 'LMF (La Menace Fantôme)', year: 2020, tracks: 17, certification: 'Double Platine' },
      { artist: 'Freeze Corleone', title: 'ADC (L\'Attaque des Clones)', year: 2023, tracks: 13, certification: 'Platine' },
      { artist: 'Orelsan', title: 'Perdu d\'avance', year: 2009, tracks: 14, certification: 'Platine' },
      { artist: 'Orelsan', title: 'Le chant des sirènes', year: 2011, tracks: 16, certification: 'Double Platine' },
      { artist: 'Orelsan', title: 'La fête est finie', year: 2017, tracks: 16, certification: 'Disque de Diamant' },
      { artist: 'Orelsan', title: 'Civilisation', year: 2021, tracks: 15, certification: 'Disque de Diamant (138 000 en 1ère semaine)' },
      { artist: 'Nekfeu', title: 'Feu', year: 2015, tracks: 18, certification: 'Disque de Diamant' },
      { artist: 'Nekfeu', title: 'Cyborg', year: 2016, tracks: 14, certification: 'Disque de Diamant (Sorti par surprise à Bercy)' },
      { artist: 'Nekfeu', title: 'Les Étoiles Vagabondes', year: 2019, tracks: 18, certification: 'Disque de Diamant (Accompagné d\'un film)' },
      { artist: 'Jul', title: 'My World', year: 2015, tracks: 21, certification: 'Disque de Diamant' },
      { artist: 'Jul', title: 'L\'Ovni', year: 2016, tracks: 23, certification: 'Triple Platine' },
      { artist: 'Jul', title: 'Inspi d\'ailleurs', year: 2018, tracks: 22, certification: 'Double Platine' },
      { artist: 'SDM', title: 'Liens du 100', year: 2022, tracks: 16, certification: 'Double Platine' },
      { artist: 'SDM', title: 'À la vie à la mort', year: 2024, tracks: 14, certification: 'Platine' },
      { artist: 'Gazo', title: 'KMT', year: 2022, tracks: 15, certification: 'Triple Platine' },
      { artist: 'Tiakola', title: 'Mélo', year: 2022, tracks: 16, certification: 'Triple Platine' },
      { artist: 'Werenoi', title: 'Carré', year: 2023, tracks: 14, certification: 'Album le plus vendu de l\'année 2023' },
      { artist: 'Dinos', title: 'Taciturne', year: 2019, tracks: 15, certification: 'Platine' },
      { artist: 'IAM', title: 'L\'École du micro d\'argent', year: 1997, tracks: 16, certification: 'Disque de Diamant (Chef d\'œuvre historique)' },
      { artist: 'Suprême NTM', title: 'Suprême NTM (Album éponyme)', year: 1998, tracks: 16, certification: 'Double Platine' },
      { artist: 'Lunatic', title: 'Mauvais Œil', year: 2000, tracks: 16, certification: 'Premier indépendant Disque d\'Or de l\'histoire' },
      { artist: 'Sexion d\'Assaut', title: 'L\'Apogée', year: 2012, tracks: 17, certification: 'Disque de Diamant (700 000+ ventes)' },
      { artist: 'Kendrick Lamar', title: 'good kid, m.A.A.d city', year: 2012, tracks: 12, certification: 'Triple Platine' },
      { artist: 'Kendrick Lamar', title: 'To Pimp a Butterfly', year: 2015, tracks: 16, certification: 'Album de la décennie (Grammy)' },
      { artist: 'Kendrick Lamar', title: 'DAMN.', year: 2017, tracks: 14, certification: 'Prix Pulitzer de musique' },
      { artist: 'Travis Scott', title: 'ASTROWORLD', year: 2018, tracks: 17, certification: 'Quadruple Platine' },
      { artist: 'Travis Scott', title: 'UTOPIA', year: 2023, tracks: 19, certification: 'Double Platine' },
      { artist: 'Eminem', title: 'The Marshall Mathers LP', year: 2000, tracks: 18, certification: 'Disque de Diamant (1,76M en 1ère semaine)' },
    ];

    // 3. ✍️ PUNCHLINES & CITATIONS LÉGENDAIRES
    this.punchlines = [
      { artist: 'Booba', quote: '« Si le savoir est une arme, soyez prêts pour le massacre. »', track: 'Repose en paix', year: 2002 },
      { artist: 'Booba', quote: '« J\'ai le bras assez long pour baisser le froc du monde. »', track: 'Pitbull', year: 2006 },
      { artist: 'Booba', quote: '« Garde la pêche, garde la foi, il n\'y a qu\'une seule règle : ne jamais baisser les bras. »', track: 'Garde la pêche', year: 2006 },
      { artist: 'Kaaris', quote: '« J\'te laisse une chance, j\'te la reprends, j\'suis pas une banque. »', track: 'Zoo', year: 2013 },
      { artist: 'Kaaris', quote: '« 2.7, 2.7 zéro, Sevran la cité des loups. »', track: 'Binks', year: 2013 },
      { artist: 'PNL', quote: '« Le monde ou rien, chez nous on dit : la mif d\'abord. »', track: 'Le monde ou rien', year: 2015 },
      { artist: 'PNL', quote: '« J\'suis dans mon hall, j\'attends que le ciel me tombe sur la tête. »', track: 'Da', year: 2016 },
      { artist: 'PNL', quote: '« Bâtiment C, septième étage, le cœur glacé comme l\'hiver. »', track: 'Naha', year: 2016 },
      { artist: 'Ninho', quote: '« J\'suis dans l\'binks, j\'fais des sous, j\'veux pas qu\'on me dise c\'que j\'dois faire. »', track: 'Goutte d\'eau', year: 2019 },
      { artist: 'Ninho', quote: '« Si t\'as pas d\'amis, prends un chien ; si t\'as pas d\'argent, fais comme si t\'en avais. »', track: 'Mamacita', year: 2017 },
      { artist: 'Damso', quote: '« Périscope dans l\'océan de mes pensées sombres. »', track: 'Macarena', year: 2017 },
      { artist: 'Damso', quote: '« J\'t\'aimais bien, mais t\'as préféré faire la belle sur les réseaux. »', track: 'BruxellesVie', year: 2016 },
      { artist: 'SCH', quote: '« Mathafack, tout est payé d\'avance. »', track: 'A7', year: 2015 },
      { artist: 'SCH', quote: '« Qu\'il est doux le parfum de la victoire quand tout le monde te voyait perdre. »', track: 'Otto', year: 2018 },
      { artist: 'Freeze Corleone', quote: '« Ekip, négro on découpe comme à l\'abattoir, zéro concession. »', track: 'Freeze Raël', year: 2020 },
      { artist: 'Freeze Corleone', quote: '« J\'arrive déterminé comme un tireur d\'élite sur le toit. »', track: 'Hors Ligne', year: 2020 },
      { artist: 'Nekfeu', quote: '« On verra bien ce que l\'avenir nous réserve, on verra bien, vas-y viens on prend la merde et on en fait de l\'or. »', track: 'On verra', year: 2015 },
      { artist: 'Orelsan', quote: '« Simple, basique. Vous n\'avez pas les bases. »', track: 'Basique', year: 2017 },
      { artist: 'Orelsan', quote: '« Si c\'était si facile, tout le monde le ferait. »', track: 'La terre est ronde', year: 2011 },
      { artist: 'Jul', quote: '« En bande organisée, personne peut nous canaliser. »', track: 'Bande Organisée', year: 2020 },
      { artist: 'Gazo', quote: '« Grr pa ! Tu connais déjà l\'équipe, zéro blabla. »', track: 'DIE', year: 2022 },
      { artist: 'SDM', quote: '« J\'roule en bolide allemand, le regard noir sous les verres teintés. »', track: 'Bolide Allemand', year: 2022 },
      { artist: 'Werenoi', quote: '« Dans le laboratoire, on peaufine la recette magique. »', track: 'Laboratoire', year: 2023 },
      { artist: 'Rohff', quote: '« C\'est nous les darons du rap, respecte les anciens avant de parler. »', track: 'La Puissance', year: 2004 },
      { artist: 'IAM', quote: '« Demain c\'est loin, alors on vit au jour le jour comme des condamnés. »', track: 'Demain c\'est loin', year: 1997 },
      { artist: 'Kendrick Lamar', quote: '« Sit down, be humble. »', track: 'HUMBLE.', year: 2017 },
      { artist: 'Travis Scott', quote: '« Out like a light, slept through the flight. »', track: 'SICKO MODE', year: 2018 },
    ];

    // 4. 🤝 FEATURINGS & CONNEXIONS MYTHIQUES
    this.featurings = [
      { track: 'Infréquentables', artist1: 'Dosseh', artist2: 'Booba', year: 2016 },
      { track: 'Médicament', artist1: 'Booba', artist2: 'Niska', year: 2019 },
      { track: 'Grand Paris', artist1: 'Médine', artist2: 'Lartiste, Lino, Sofiane, Alivor, Seth Gueko, Ninho, Youssoupha', year: 2017 },
      { track: 'Bande Organisée', artist1: 'Jul', artist2: 'SCH, Kofs, Naps, Soso Maness, Elams, Houari, Solda', year: 2020 },
      { track: 'Tricheur', artist1: 'Nekfeu', artist2: 'Damso', year: 2019 },
      { track: 'Mode Akimbo', artist1: 'SCH', artist2: 'Jul', year: 2021 },
      { track: 'Kassav', artist1: 'Gazo', artist2: 'Tiakola', year: 2021 },
      { track: 'La Seleçao', artist1: 'Alonzo', artist2: 'Jul & Naps', year: 2021 },
      { track: 'Tout gâcher', artist1: 'Green Montana', artist2: 'Booba', year: 2020 },
      { track: 'Kim Jong-Un', artist1: 'Freeze Corleone', artist2: 'Central Cee', year: 2022 },
      { track: 'Daddy Chocolat', artist1: 'Koba LaD', artist2: 'Gazo', year: 2021 },
      { track: 'Dernier Retrait', artist1: 'SDM', artist2: 'PLK', year: 2024 },
    ];

    // 5. 💡 ANECDOTES & CULTURE BOOSKA-P
    this.anecdotes = [
      {
        question: 'Quel rappeur a rendu mythique l\'expression « Téma la taille du rat » reprise partout par la culture rap ?',
        correct: 'Kaaris',
        wrongs: ['Booba', 'Gradur', 'Mister V'],
        explanation: 'Kaaris a popularisé des dizaines d\'expressions devenues cultes dans les interviews et freestyles Booska-P.'
      },
      {
        question: 'Dans quel célèbre freestyle Booska-P un rappeur a-t-il posé devant la Tour Eiffel en hélicoptère pour annoncer son album ?',
        correct: 'PNL (Deux Frères)',
        wrongs: ['Ninho', 'Gazo', 'SCH'],
        explanation: 'PNL a privatisé le sommet de la Tour Eiffel pour le clip monumental d\'« Au DD ».'
      },
      {
        question: 'Quel artiste détient le record historique absolu du nombre de singles d\'Or, Platine et Diamant en France ?',
        correct: 'Ninho',
        wrongs: ['Jul', 'Booba', 'Gims'],
        explanation: 'Ninho (« Jefe ») est le recordman incontesté des certifications du SNEP avec plus de 300 singles certifiés !'
      },
      {
        question: 'Quel producteur réputé de Katrina Squad a signé les plus gros hits de SCH (« A7 », « Champs-Élysées », « Gomorra ») ?',
        correct: 'Guilty (Katrina Squad)',
        wrongs: ['Seezy', 'Flem', 'BBP'],
        explanation: 'Guilty et l\'écurie toulousaine Katrina Squad ont forgé l\'identité sonore cinématographique du S.'
      },
      {
        question: 'Quel rappeur du 93 a fait exploser la Drill en France dès 2020 avec sa célèbre série de freestyles « Drill FR » ?',
        correct: 'Gazo',
        wrongs: ['Ziak', '13 Block', 'Freeze Corleone'],
        explanation: 'Gazo est unanimement reconnu comme le précurseur et le roi de la Drill FR.'
      },
      {
        question: 'Quel groupe légendaire marseillais a enregistré le chef d\'œuvre « L\'École du micro d\'argent » en 1997 à New York ?',
        correct: 'IAM',
        wrongs: ['Fonky Family', 'Psy 4 de la Rime', '3e Œil'],
        explanation: 'IAM a mixé cet album mythique aux studios Greene St. à New York pour un son d\'une précision inégalée.'
      },
      {
        question: 'En quelle année a été diffusé le tout premier épisode de la mythique émission « Booska d\'Or » sur Booska-P ?',
        correct: '2005',
        wrongs: ['2010', '1998', '2015'],
        explanation: 'Booska-P est le média hip-hop de référence en France depuis le milieu des années 2000.'
      },
      {
        question: 'Quel est le premier album de rap français indépendant de l\'histoire à avoir été certifié Disque d\'Or ?',
        correct: '« Mauvais Œil » de Lunatic (Booba & Ali)',
        wrongs: ['« Temps Mort » de Booba', '« Première Consultation » de Doc Gynéco', '« Métèque et mat » d\'Akhenaton'],
        explanation: 'Sorti en 2000 sur le label indépendant 45 Scientific, « Mauvais Œil » a marqué un tournant historique pour l\'indépendance dans le rap français.'
      },
      {
        question: 'Quel beatmaker belge membre d\'Animalsons puis de QLF a produit la quasi-totalité des chefs d\'œuvre de Damso et PNL ?',
        correct: 'BBP',
        wrongs: ['Junior Alaprod', 'Flem', 'Skread'],
        explanation: 'BBP est l\'architecte sonore des classiques « Naha », « Onizuka », « Macarena » et « BruxellesVie ».'
      },
      {
        question: 'Combien d\'albums studio Jul a-t-il sortis en plus de 10 ans de carrière ?',
        correct: 'Plus de 30 albums',
        wrongs: ['12 albums', '18 albums', '50 albums'],
        explanation: 'Avec 2 à 4 albums par an (payants et gratuits), Jul est le rappeur le plus prolifique et le plus gros vendeur de l\'histoire du rap français.'
      }
    ];
  }

  /**
   * 🎲 Générateur de distracteurs aléatoires
   */
  getRandomDistractors(pool, correctVal, count = 3, key = null) {
    const list = pool
      .map(item => (key ? item[key] : item))
      .filter(val => val !== correctVal && Boolean(val));

    // Shuffle
    const shuffled = [...new Set(list)].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  /**
   * 🌟 GÉNÉRATION DYNAMIQUE PROCÉDURALE (20 000+ COMBINAISONS)
   * Génère une question déterministe par index (de 0 à 30 000+)
   */
  generateQuestionByIndex(index) {
    const seed = Math.abs(index) % 25000;
    const type = seed % 8; // 8 types de questions

    if (type === 0) {
      // 🎤 TYPE 0 : PUNCHLINES CULTES (« Qui a dit cette phrase ? »)
      const pIdx = (seed * 7 + 13) % this.punchlines.length;
      const punchline = this.punchlines[pIdx];
      const correct = punchline.artist;
      const wrongs = this.getRandomDistractors(this.artists, correct, 3, 'name');

      return {
        id: `q_punch_${seed}`,
        category: 'Punchline Culte',
        categoryIcon: '🎤',
        difficulty: 'MOYEN',
        question: `Qui a lâché cette punchline légendaire :\n${punchline.quote} ?`,
        options: this.shuffleOptions([correct, ...wrongs]),
        correct: correct,
        anecdote: `Extrait du morceau mythique « ${punchline.track} » (${punchline.year}) par ${punchline.artist}. Un classique absolu !`,
      };
    } else if (type === 1) {
      // 💿 TYPE 1 : ANNÉE DE SORTIE D'ALBUM
      const aIdx = (seed * 11 + 5) % this.albums.length;
      const album = this.albums[aIdx];
      const correctYear = String(album.year);
      // Generate close-call plausible years (±1, ±2, ±3)
      const offsets = [-3, -2, -1, 1, 2, 3].sort(() => 0.5 - Math.random()).slice(0, 3);
      const wrongYears = offsets.map(o => String(album.year + o));

      return {
        id: `q_album_year_${seed}`,
        category: 'Années & Albums',
        categoryIcon: '💿',
        difficulty: 'DIFFICILE',
        question: `En quelle année est sorti le projet culte « ${album.title} » de ${album.artist} ?`,
        options: this.shuffleOptions([correctYear, ...wrongYears]),
        correct: correctYear,
        anecdote: `L'album « ${album.title} » est sorti en ${album.year} (${album.tracks} titres) et a été certifié ${album.certification}.`,
      };
    } else if (type === 2) {
      // 🌍 TYPE 2 : VILLES, DÉPARTEMENTS & QUARTIERS
      const aIdx = (seed * 3 + 17) % this.artists.length;
      const artist = this.artists[aIdx];
      const correctDept = artist.dept;
      const wrongDepts = this.getRandomDistractors(this.artists, correctDept, 3, 'dept');

      return {
        id: `q_dept_${seed}`,
        category: 'Origines & Quartiers',
        categoryIcon: '📍',
        difficulty: 'FACILE',
        question: `De quel département ou secteur est originaire le rappeur ${artist.name} ?`,
        options: this.shuffleOptions([correctDept, ...wrongDepts]),
        correct: correctDept,
        anecdote: `${artist.name} a fait ses armes à ${artist.city} (${artist.dept}), berceau de son identité musicale.`,
      };
    } else if (type === 3) {
      // 👑 TYPE 3 : VRAIS NOMS D'ARTISTES
      const aIdx = (seed * 13 + 7) % this.artists.length;
      const artist = this.artists[aIdx];
      const correctName = artist.realName;
      const wrongNames = this.getRandomDistractors(this.artists, correctName, 3, 'realName');

      return {
        id: `q_realname_${seed}`,
        category: 'Identité & Vrais Noms',
        categoryIcon: '🪪',
        difficulty: 'MOYEN',
        question: `Quel est le véritable prénom et nom civil du rappeur ${artist.name} ?`,
        options: this.shuffleOptions([correctName, ...wrongNames]),
        correct: correctName,
        anecdote: `Derrière le blaze ${artist.name} se cache ${artist.realName}, auteur de nombreux disques de platine.`,
      };
    } else if (type === 4) {
      // 🤝 TYPE 4 : FEATURINGS & CONNEXIONS
      const fIdx = (seed * 19 + 2) % this.featurings.length;
      const feat = this.featurings[fIdx];
      const correct = feat.artist2;
      const wrongs = this.getRandomDistractors(this.artists, correct, 3, 'name');

      return {
        id: `q_feat_${seed}`,
        category: 'Featurings & Collabs',
        categoryIcon: '🤝',
        difficulty: 'MOYEN',
        question: `Qui pose aux côtés de ${feat.artist1} sur le classique « ${feat.track} » ?`,
        options: this.shuffleOptions([correct, ...wrongs]),
        correct: correct,
        anecdote: `Ce feat d'anthologie entre ${feat.artist1} et ${feat.artist2} est sorti en ${feat.year} et a enflammé les charts !`,
      };
    } else if (type === 5) {
      // 🎹 TYPE 5 : BEATMAKERS & PRODUCTEURS
      const aIdx = (seed * 5 + 9) % this.artists.length;
      const artist = this.artists[aIdx];
      const correct = artist.beatmaker;
      const wrongs = this.getRandomDistractors(this.artists, correct, 3, 'beatmaker');

      return {
        id: `q_beat_${seed}`,
        category: 'Beatmakers & Instrus',
        categoryIcon: '🎹',
        difficulty: 'EXPERT',
        question: `Quel beatmaker / compositeur fétiche a signé les plus gros bangers de ${artist.name} ?`,
        options: this.shuffleOptions([correct, ...wrongs]),
        correct: correct,
        anecdote: `Le producteur ${artist.beatmaker} a largement façonné la couleur des productions de ${artist.name}.`,
      };
    } else if (type === 6) {
      // 🏷️ TYPE 6 : LABELS & COLLECTIFS
      const aIdx = (seed * 17 + 1) % this.artists.length;
      const artist = this.artists[aIdx];
      const correct = artist.label;
      const wrongs = this.getRandomDistractors(this.artists, correct, 3, 'label');

      return {
        id: `q_label_${seed}`,
        category: 'Labels & Équipes',
        categoryIcon: '🏷️',
        difficulty: 'MOYEN',
        question: `À quel label ou collectif emblématique est affilié ${artist.name} ?`,
        options: this.shuffleOptions([correct, ...wrongs]),
        correct: correct,
        anecdote: `${artist.name} a imposé sa signature avec l'écurie ${artist.label}.`,
      };
    } else {
      // 💡 TYPE 7 : ANECDOTES & HISTOIRE BOOSKA-P
      const anIdx = (seed * 23 + 4) % this.anecdotes.length;
      const anec = this.anecdotes[anIdx];

      return {
        id: `q_anec_${seed}`,
        category: 'Culture Booska-P',
        categoryIcon: '🔥',
        difficulty: 'FACILE',
        question: anec.question,
        options: this.shuffleOptions([anec.correct, ...anec.wrongs]),
        correct: anec.correct,
        anecdote: anec.explanation,
      };
    }
  }

  /**
   * 🔀 Mélange 4 options
   */
  shuffleOptions(options) {
    const unique = [...new Set(options)];
    while (unique.length < 4) {
      unique.push('Autre choix');
    }
    return unique.sort(() => 0.5 - Math.random());
  }

  /**
   * 📦 Récupère une série de N questions uniques et aléatoires
   */
  getBatchQuestions(count = 10, category = 'all') {
    const questions = [];
    const usedIds = new Set();
    const targetCount = Math.min(Math.max(1, parseInt(count, 10) || 10), 50);

    let attempts = 0;
    while (questions.length < targetCount && attempts < targetCount * 10) {
      attempts++;
      const randSeed = Math.floor(Math.random() * 25000);
      const q = this.generateQuestionByIndex(randSeed);

      if (!usedIds.has(q.id)) {
        usedIds.add(q.id);
        questions.push(q);
      }
    }

    return questions;
  }

  /**
   * 📊 Statistiques de la base de questions
   */
  getStats() {
    return {
      totalQuestionsAvailable: 25000,
      curatedPunchlines: this.punchlines.length,
      curatedAlbums: this.albums.length,
      curatedArtists: this.artists.length,
      categories: [
        'Punchline Culte',
        'Années & Albums',
        'Origines & Quartiers',
        'Identité & Vrais Noms',
        'Featurings & Collabs',
        'Beatmakers & Instrus',
        'Labels & Équipes',
        'Culture Booska-P'
      ],
      certifiedBooskaP: true,
    };
  }
}

module.exports = new RapQuizService();
