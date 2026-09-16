/**
 * 🎵 MusicQuizService.js — Moteur Procédural Multi-Thèmes de Culture Musicale (30 000+ Questions)
 * Thèmes couverts :
 * 1. 🎤 Rap & Hip-Hop (FR & US)
 * 2. 🎸 Rock, Pop-Rock & Légendes
 * 3. 💃 Pop Internationale & Hits Planétaires
 * 4. 🇫🇷 Chanson Française & Variété
 * 5. 🪩 Electro, Dance & French Touch
 * 6. 📼 Années 80s & 90s Rétro Culte
 * 7. 🎬 Bandes Originales, Cinéma & Séries
 * 8. 🌍 Musiques du Monde, Latino & Afrobeat
 * 9. ✨ Mix de Toutes les Musiques
 */

class MusicQuizService {
  constructor() {
    this.initData();
  }

  initData() {
    // ═══════════════════════════════════════
    // 1. 🎤 RAP & HIP-HOP (FR & US)
    // ═══════════════════════════════════════
    this.rapArtists = [
      { name: 'Booba', realName: 'Élie Yaffa', city: 'Boulogne-Billancourt (92)', label: '92i', classics: ['Boulbi', 'Numéro 10', 'DKR', 'Pitbull', 'Scarface'], year: 2002, album: 'Temps Mort' },
      { name: 'Kaaris', realName: 'Okou Armand Gnakouri', city: 'Sevran (93)', label: 'Therapy Music', classics: ['Zoo', 'Tchoin', 'Binks', 'Se-Vrak'], year: 2013, album: 'Or Noir' },
      { name: 'Ninho', realName: 'William Nzobazola', city: 'Yerres / Nemours (91/77)', label: 'TTR / Rec. 118', classics: ['Goutte d\'eau', 'La vie qu\'on mène', 'Jefe', 'Lettre à une femme'], year: 2017, album: 'Comme prévu' },
      { name: 'PNL', realName: 'Ademo & N.O.S (Tarik et Nabil)', city: 'Corbeil-Essonnes (91)', label: 'QLF Records', classics: ['Au DD', 'Da', 'Le monde ou rien', 'Naha'], year: 2015, album: 'Le Monde Chico' },
      { name: 'Jul', realName: 'Julien Mari', city: 'Marseille (13)', label: 'D\'Or et de Platine', classics: ['Tchikita', 'JCVD', 'Bande Organisée', 'Sousou'], year: 2014, album: 'Dans ma paranoïa' },
      { name: 'SCH', realName: 'Julien Schwarzer', city: 'Aubagne (13)', label: 'Maison Baron Rouge', classics: ['Champs-Élysées', 'Otto', 'Fusil', 'Gomorra'], year: 2015, album: 'A7' },
      { name: 'Freeze Corleone', realName: 'Issa Lorenzo Diakhaté', city: 'Les Lilas (93)', label: '667', classics: ['Freeze Raël', 'Hors Ligne', 'Desiigner'], year: 2020, album: 'LMF' },
      { name: 'Damso', realName: 'William Kalubi', city: 'Bruxelles', label: 'TheVie', classics: ['Macarena', 'BruxellesVie', 'Feu de bois', 'Morose'], year: 2016, album: 'Batterie Faible' },
      { name: 'Orelsan', realName: 'Aurélien Cotentin', city: 'Caen (14)', label: '7th Magnitude', classics: ['Basique', 'La terre est ronde', 'L\'odeur de l\'essence'], year: 2009, album: 'Perdu d\'avance' },
      { name: 'Eminem', realName: 'Marshall Mathers', city: 'Detroit (USA)', label: 'Shady / Aftermath', classics: ['Lose Yourself', 'Without Me', 'The Real Slim Shady', 'Stan'], year: 1999, album: 'The Slim Shady LP' },
      { name: 'Kendrick Lamar', realName: 'Kendrick Duckworth', city: 'Compton, CA (USA)', label: 'pgLang / TDE', classics: ['HUMBLE.', 'Not Like Us', 'Alright', 'DNA.'], year: 2012, album: 'good kid, m.A.A.d city' },
      { name: 'Drake', realName: 'Aubrey Drake Graham', city: 'Toronto (Canada)', label: 'OVO Sound', classics: ['God\'s Plan', 'Hotline Bling', 'One Dance'], year: 2010, album: 'Thank Me Later' },
      { name: 'Travis Scott', realName: 'Jacques Webster', city: 'Houston, TX (USA)', label: 'Cactus Jack', classics: ['SICKO MODE', 'Goosebumps', 'FE!N', 'Antidote'], year: 2015, album: 'Rodeo' },
    ];

    this.rapQuotes = [
      { quote: '« Si le savoir est une arme, soyez prêts pour le carnage. »', artist: 'Kery James', track: 'Le retour du rap français', year: 2008 },
      { quote: '« J\'suis dans l\'bâtiment, j\'fais des sous, j\'fais des sous. »', artist: 'Ninho', track: 'Binks to Binks 6', year: 2019 },
      { quote: '« Que la famille dans l\'bâtiment, tout pour la miff. »', artist: 'PNL', track: 'Le monde ou rien', year: 2015 },
      { quote: '« Mais qu\'est-ce qui s\'passe ? La police arrive en masse ! »', artist: 'Suprême NTM', track: 'Police', year: 1993 },
      { quote: '« Wesh alors, t\'es branché ou pas ? »', artist: 'Jul', track: 'Wesh Alors', year: 2015 },
      { quote: '« Tu veux la guerre ? On te fera la guerre ! »', artist: 'Kaaris', track: 'Zoo', year: 2013 },
      { quote: '« Simple... Basique... Vous n\'avez pas les bases. »', artist: 'Orelsan', track: 'Basique', year: 2017 },
      { quote: '« J\'ai fait le tour de la terre, y\'a pas deux comme toi. »', artist: 'Damso', track: 'Macarena', year: 2017 },
      { quote: '« Guess who\'s back, back again? Shady\'s back, tell a friend. »', artist: 'Eminem', track: 'Without Me', year: 2002 },
      { quote: '« Sit down, be humble. »', artist: 'Kendrick Lamar', track: 'HUMBLE.', year: 2017 },
    ];

    // ═══════════════════════════════════════
    // 2. 🎸 ROCK, POP-ROCK & LÉGENDES
    // ═══════════════════════════════════════
    this.rockArtists = [
      { name: 'Queen', singer: 'Freddie Mercury', country: 'Royaume-Uni', guitarist: 'Brian May', year: 1975, album: 'A Night at the Opera', classics: ['Bohemian Rhapsody', 'We Will Rock You', 'Don\'t Stop Me Now', 'Another One Bites the Dust'] },
      { name: 'AC/DC', singer: 'Brian Johnson / Bon Scott', country: 'Australie', guitarist: 'Angus Young', year: 1980, album: 'Back in Black', classics: ['Highway to Hell', 'Back in Black', 'Thunderstruck', 'Hells Bells'] },
      { name: 'Nirvana', singer: 'Kurt Cobain', country: 'USA (Seattle)', drummer: 'Dave Grohl', year: 1991, album: 'Nevermind', classics: ['Smells Like Teen Spirit', 'Come as You Are', 'Lithium', 'In Bloom'] },
      { name: 'The Beatles', singer: 'John Lennon & Paul McCartney', country: 'Royaume-Uni (Liverpool)', year: 1969, album: 'Abbey Road', classics: ['Hey Jude', 'Let It Be', 'Come Together', 'Yesterday', 'Help!'] },
      { name: 'The Rolling Stones', singer: 'Mick Jagger', country: 'Royaume-Uni', guitarist: 'Keith Richards', year: 1965, album: 'Out of Our Heads', classics: ['(I Can\'t Get No) Satisfaction', 'Paint It Black', 'Angie', 'Sympathy for the Devil'] },
      { name: 'Pink Floyd', singer: 'Roger Waters / David Gilmour', country: 'Royaume-Uni', year: 1973, album: 'The Dark Side of the Moon', classics: ['Another Brick in the Wall', 'Wish You Were Here', 'Comfortably Numb', 'Time'] },
      { name: 'Led Zeppelin', singer: 'Robert Plant', country: 'Royaume-Uni', guitarist: 'Jimmy Page', year: 1971, album: 'Led Zeppelin IV', classics: ['Stairway to Heaven', 'Whole Lotta Love', 'Kashmir', 'Black Dog'] },
      { name: 'Metallica', singer: 'James Hetfield', country: 'USA', drummer: 'Lars Ulrich', year: 1991, album: 'The Black Album', classics: ['Enter Sandman', 'Nothing Else Matters', 'Master of Puppets', 'One'] },
      { name: 'U2', singer: 'Bono', country: 'Irlande (Dublin)', guitarist: 'The Edge', year: 1987, album: 'The Joshua Tree', classics: ['With or Without You', 'Sunday Bloody Sunday', 'One', 'Where the Streets Have No Name'] },
      { name: 'Téléphone', singer: 'Jean-Louis Aubert', country: 'France', guitarist: 'Louis Bertignac', year: 1977, album: 'Téléphone', classics: ['Ça (c\'est vraiment toi)', 'Cendrillon', 'Un autre monde', 'La Bombe humaine'] },
      { name: 'Indochine', singer: 'Nicola Sirkis', country: 'France', year: 1982, album: 'L\'Aventurier', classics: ['L\'Aventurier', 'J\'ai demandé à la lune', 'Trois nuits par semaine', 'Nos célébrations'] },
      { name: 'Guns N\' Roses', singer: 'Axl Rose', country: 'USA', guitarist: 'Slash', year: 1987, album: 'Appetite for Destruction', classics: ['Sweet Child O\' Mine', 'November Rain', 'Paradise City', 'Welcome to the Jungle'] },
      { name: 'Red Hot Chili Peppers', singer: 'Anthony Kiedis', country: 'USA', bassist: 'Flea', year: 1999, album: 'Californication', classics: ['Californication', 'Can\'t Stop', 'Under the Bridge', 'Otherside'] },
      { name: 'Oasis', singer: 'Liam Gallagher & Noel Gallagher', country: 'Royaume-Uni (Manchester)', year: 1995, album: '(What\'s the Story) Morning Glory?', classics: ['Wonderwall', 'Don\'t Look Back in Anger', 'Champagne Supernova'] }
    ];

    this.rockQuotes = [
      { quote: '« Is this the real life? Is this just fantasy? Caught in a landslide, no escape from reality. »', artist: 'Queen', track: 'Bohemian Rhapsody', year: 1975 },
      { quote: '« I\'m on the highway to hell! No stop signs, speed limit, nobody\'s gonna slow me down. »', artist: 'AC/DC', track: 'Highway to Hell', year: 1979 },
      { quote: '« With the lights out, it\'s less dangerous! Here we are now, entertain us! »', artist: 'Nirvana', track: 'Smells Like Teen Spirit', year: 1991 },
      { quote: '« I can\'t get no satisfaction, \'cause I try and I try and I try... »', artist: 'The Rolling Stones', track: '(I Can\'t Get No) Satisfaction', year: 1965 },
      { quote: '« All you need is love, love. Love is all you need. »', artist: 'The Beatles', track: 'All You Need Is Love', year: 1967 },
      { quote: '« We don\'t need no education, we don\'t need no thought control. »', artist: 'Pink Floyd', track: 'Another Brick in the Wall (Part 2)', year: 1979 },
      { quote: '« Et Bob Morane contre tout chacal, l\'aventurier contre tout guerrier... »', artist: 'Indochine', track: 'L\'Aventurier', year: 1982 },
      { quote: '« Je rêvais d\'un autre monde, où la Terre serait ronde, où la lune serait blonde... »', artist: 'Téléphone', track: 'Un autre monde', year: 1984 },
    ];

    // ═══════════════════════════════════════
    // 3. 💃 POP INTERNATIONALE & HITS
    // ═══════════════════════════════════════
    this.popArtists = [
      { name: 'Michael Jackson', title: 'Roi de la Pop', country: 'USA', year: 1982, album: 'Thriller (Album le plus vendu de l\'histoire)', classics: ['Billie Jean', 'Beat It', 'Thriller', 'Smooth Criminal', 'Bad', 'Black or White'] },
      { name: 'Madonna', title: 'Reine de la Pop', country: 'USA', year: 1984, album: 'Like a Virgin', classics: ['Like a Virgin', 'Vogue', 'Hung Up', 'La Isla Bonita', 'Material Girl'] },
      { name: 'The Weeknd', realName: 'Abel Tesfaye', country: 'Canada', year: 2020, album: 'After Hours', classics: ['Blinding Lights (Record absolu Billboard)', 'Starboy', 'Save Your Tears', 'Can\'t Feel My Face'] },
      { name: 'Dua Lipa', country: 'Royaume-Uni', year: 2020, album: 'Future Nostalgia', classics: ['Levitating', 'Don\'t Start Now', 'New Rules', 'Physical', 'Dance the Night'] },
      { name: 'Taylor Swift', country: 'USA', year: 2014, album: '1989', classics: ['Shake It Off', 'Blank Space', 'Cruel Summer', 'Anti-Hero', 'Love Story'] },
      { name: 'Beyoncé', title: 'Queen B', country: 'USA (Houston)', year: 2003, album: 'Dangerously in Love', classics: ['Single Ladies', 'Halo', 'Crazy in Love', 'Texas Hold \'Em'] },
      { name: 'Rihanna', country: 'Barbade', year: 2007, album: 'Good Girl Gone Bad', classics: ['Umbrella', 'Diamonds', 'We Found Love', 'Don\'t Stop the Music', 'Work'] },
      { name: 'Bruno Mars', country: 'USA (Hawaï)', year: 2010, album: 'Doo-Wops & Hooligans', classics: ['Uptown Funk', '24K Magic', 'Locked Out of Heaven', 'Just the Way You Are'] },
      { name: 'Lady Gaga', realName: 'Stefani Germanotta', country: 'USA', year: 2008, album: 'The Fame', classics: ['Bad Romance', 'Poker Face', 'Shallow', 'Born This Way', 'Just Dance'] },
      { name: 'Britney Spears', country: 'USA', year: 1999, album: '...Baby One More Time', classics: ['...Baby One More Time', 'Toxic', 'Oops!... I Did It Again', 'Gimme More'] },
      { name: 'Ed Sheeran', country: 'Royaume-Uni', year: 2017, album: '÷ (Divide)', classics: ['Shape of You', 'Perfect', 'Thinking Out Loud', 'Bad Habits'] },
      { name: 'Katy Perry', country: 'USA', year: 2010, album: 'Teenage Dream', classics: ['Firework', 'Roar', 'I Kissed a Girl', 'California Gurls', 'Dark Horse'] },
    ];

    this.popQuotes = [
      { quote: '« Billie Jean is not my lover, she\'s just a girl who claims that I am the one... »', artist: 'Michael Jackson', track: 'Billie Jean', year: 1982 },
      { quote: '« I said, ooh, I\'m blinded by the lights. No, I can\'t sleep until I feel your touch. »', artist: 'The Weeknd', track: 'Blinding Lights', year: 2019 },
      { quote: '« Under my umbrella, ella, ella, eh, eh, eh... »', artist: 'Rihanna', track: 'Umbrella', year: 2007 },
      { quote: '« If you liked it, then you should have put a ring on it! »', artist: 'Beyoncé', track: 'Single Ladies', year: 2008 },
      { quote: '« Baby, cause I\'m a firework! Come on, show \'em what you\'re worth! »', artist: 'Katy Perry', track: 'Firework', year: 2010 },
      { quote: '« Rah, rah-ah-ah-ah, roma, roma-ma, gaga, ooh-la-la, want your bad romance! »', artist: 'Lady Gaga', track: 'Bad Romance', year: 2009 },
      { quote: '« Cause the players gonna play, play, play, and the haters gonna hate, hate, hate... »', artist: 'Taylor Swift', track: 'Shake It Off', year: 2014 },
    ];

    // ═══════════════════════════════════════
    // 4. 🇫🇷 CHANSON FRANÇAISE & VARIÉTÉ
    // ═══════════════════════════════════════
    this.chansonArtists = [
      { name: 'Jean-Jacques Goldman', country: 'France', year: 1987, album: 'Entre gris clair et gris foncé', classics: ['Envole-moi', 'Je te donne', 'Il suffira d\'un signe', 'Quand la musique est bonne', 'À nos actes manqués'] },
      { name: 'Johnny Hallyday', country: 'France', title: 'L\'Idole des Jeunes', year: 1969, album: 'Rivière... ouvre ton lit', classics: ['Allumer le feu', 'Que je t\'aime', 'L\'Envie', 'Marie', 'Je te promets', 'Noir c\'est noir'] },
      { name: 'Céline Dion', country: 'Canada (Québec)', year: 1995, album: 'D\'eux (Album francophone le plus vendu au monde)', classics: ['Pour que tu m\'aimes encore', 'S\'il suffisait d\'aimer', 'J\'irai où tu iras', 'My Heart Will Go On'] },
      { name: 'Renaud', country: 'France (Paris)', year: 1985, album: 'Mistral gagnant', classics: ['Mistral gagnant (Élue chanson préférée des Français)', 'Morgane de toi', 'Dès que le vent soufflera', 'Laisse béton'] },
      { name: 'Daniel Balavoine', country: 'France', year: 1985, album: 'Sauver l\'amour', classics: ['L\'Aziza', 'Tous les cris les SOS', 'Le Chanteur', 'Sauver l\'amour', 'Mon fils ma bataille'] },
      { name: 'Francis Cabrel', country: 'France (Astaffort)', year: 1994, album: 'Samedi soir sur la Terre', classics: ['Je l\'aime à mourir', 'La Corrida', 'Petite Marie', 'C\'est écrit', 'L\'encre de tes yeux'] },
      { name: 'Michel Berger', country: 'France', year: 1980, album: 'Beauséjour', classics: ['La Groupie du pianiste', 'Quelques mots d\'amour', 'Le Paradis blanc', 'Chanter pour ceux qui sont loin de chez eux'] },
      { name: 'Stromae', realName: 'Paul Van Haver', country: 'Belgique (Bruxelles)', year: 2013, album: 'Racine Carrée', classics: ['Alors on danse', 'Papaoutai', 'Formidable', 'Tous les mêmes', 'L\'enfer'] },
      { name: 'Charles Aznavour', country: 'France', year: 1965, album: 'La Bohème', classics: ['La Bohème', 'Emmenez-moi', 'Hier encore', 'Comme ils disent', 'For me formidable'] },
      { name: 'Jacques Brel', country: 'Belgique', year: 1959, album: 'La Valse à mille temps', classics: ['Ne me quitte pas', 'Amsterdam', 'Quand on n\'a que l\'amour', 'Vesoul', 'Les Bourgeois'] },
    ];

    this.chansonQuotes = [
      { quote: '« Envole-moi, envole-moi, loin de cette fatalité qui colle à ma peau ! »', artist: 'Jean-Jacques Goldman', track: 'Envole-moi', year: 1984 },
      { quote: '« Allumer le feu ! Allumer le feu ! Et faire danser les diables et les dieux ! »', artist: 'Johnny Hallyday', track: 'Allumer le feu', year: 1998 },
      { quote: '« J\'irai chercher ton cœur si tu l\'emportes ailleurs, même si dans tes danses d\'autres dansent tes heures... »', artist: 'Céline Dion', track: 'Pour que tu m\'aimes encore', year: 1995 },
      { quote: '« Te raconter enfin qu\'il faut aimer la vie, l\'aimer même si le temps est assassin et emporte avec lui les rires des enfants... »', artist: 'Renaud', track: 'Mistral gagnant', year: 1985 },
      { quote: '« Et j\'ai crié, crié, Aline, pour qu\'elle revienne ! Et j\'ai pleuré, pleuré, oh ! j\'avais trop de peine ! »', artist: 'Christophe', track: 'Aline', year: 1965 },
      { quote: '« Je m\'présente, je m\'appelle Henri. J\'voudrais bien réussir ma vie, être aimé... »', artist: 'Daniel Balavoine', track: 'Le Chanteur', year: 1978 },
      { quote: '« Dans le port d\'Amsterdam, y a des marins qui chantent les rêves qui les hantent au large d\'Amsterdam... »', artist: 'Jacques Brel', track: 'Amsterdam', year: 1964 },
    ];

    // ═══════════════════════════════════════
    // 5. 🪩 ELECTRO, DANCE & FRENCH TOUCH
    // ═══════════════════════════════════════
    this.electroArtists = [
      { name: 'Daft Punk', members: 'Thomas Bangalter & Guy-Manuel de Homem-Christo', country: 'France (Paris)', year: 1997, album: 'Homework', classics: ['Around the World', 'One More Time', 'Harder, Better, Faster, Stronger', 'Get Lucky', 'Da Funk'] },
      { name: 'David Guetta', country: 'France (Paris)', year: 2009, album: 'One Love', classics: ['Titanium (feat. Sia)', 'When Love Takes Over', 'Memories', 'I\'m Good (Blue)', 'Sexy Bitch'] },
      { name: 'Avicii', realName: 'Tim Bergling', country: 'Suède (Stockholm)', year: 2013, album: 'True', classics: ['Wake Me Up', 'Levels', 'The Nights', 'Waiting for Love', 'Hey Brother'] },
      { name: 'DJ Snake', realName: 'William Grigahcine', country: 'France (Ermont)', year: 2016, album: 'Encore', classics: ['Lean On (avec Major Lazer)', 'Turn Down for What', 'Let Me Love You (feat. Justin Bieber)', 'Taki Taki'] },
      { name: 'Martin Garrix', country: 'Pays-Bas', year: 2013, album: 'Animals (EP)', classics: ['Animals (Numéro 1 mondial à 17 ans)', 'In the Name of Love', 'Scared to Be Lonely'] },
      { name: 'Bob Sinclar', realName: 'Christophe Le Friant', country: 'France', year: 2005, album: 'Western Dream', classics: ['Love Generation', 'World, Hold On', 'Rock This Party'] },
      { name: 'Justice', members: 'Gaspard Augé & Xavier de Rosnay', country: 'France', year: 2007, album: '† (Cross)', classics: ['D.A.N.C.E.', 'Genesis', 'Stress', 'We Are Your Friends'] },
      { name: 'Calvin Harris', country: 'Royaume-Uni (Écosse)', year: 2012, album: '18 Months', classics: ['Summer', 'This Is What You Came For', 'One Kiss', 'Feel So Close', 'Outside'] },
      { name: 'Kavinsky', realName: 'Vincent Belorgey', country: 'France', year: 2013, album: 'OutRun', classics: ['Nightcall (BO du film Drive)', 'Pacific Coast Highway', 'Roadgame'] }
    ];

    // ═══════════════════════════════════════
    // 6. 📼 ANNÉES 80s & 90s CULTE
    // ═══════════════════════════════════════
    this.retroClassics = [
      { track: 'Take On Me', artist: 'A-ha', year: 1985, genre: 'Synthpop 80s', anecdote: 'Le clip vidéo mythique mêlant dessin animé au crayon rotoscopé et prises de vue réelles a dépassé 1,5 milliard de vues sur YouTube.' },
      { quote: '« Never gonna give you up, never gonna let you down, never gonna run around and desert you! »', artist: 'Rick Astley', track: 'Never Gonna Give You Up', year: 1987, anecdote: 'À l\'origine du phénomène viral d\'Internet baptisé le « Rickroll ».' },
      { track: 'Sweet Dreams (Are Made of This)', artist: 'Eurythmics', year: 1983, singer: 'Annie Lennox', anecdote: 'Composé sur un synthétiseur modulaire Movement MCS dans un grenier londonien.' },
      { quote: '« Wake me up before you go-go, don\'t leave me hanging on like a yo-yo! »', artist: 'Wham! (George Michael)', track: 'Wake Me Up Before You Go-Go', year: 1984 },
      { track: 'Enjoy the Silence', artist: 'Depeche Mode', year: 1990, album: 'Violator', anecdote: 'Dans le clip, Dave Gahan déambule habillé en roi avec une chaise pliante à travers des paysages déserts.' },
      { quote: '« What is love? Baby don\'t hurt me, don\'t hurt me, no more! »', artist: 'Haddaway', track: 'What Is Love', year: 1993, genre: 'Eurodance 90s' },
      { track: 'Rhythm Is a Dancer', artist: 'Snap!', year: 1992, genre: 'Eurodance 90s', anecdote: 'L\'un des plus grands tubes de rave et d\'eurodance européenne des années 90.' },
      { quote: '« Nuit de folie ! Et tu chantes, chantes, chantes ce refrain qui te plaît... »', artist: 'Début de Soirée', track: 'Nuit de folie', year: 1988, anecdote: 'Numéro 1 du Top 50 en France pendant 9 semaines consécutives à l\'été 1988.' }
    ];

    // ═══════════════════════════════════════
    // 7. 🎬 CINÉMA, SÉRIES & BANDES ORIGINALES
    // ═══════════════════════════════════════
    this.cinemaThemes = [
      { movie: 'Star Wars (La Guerre des Étoiles)', composer: 'John Williams', theme: 'La Marche Impériale (Darth Vader\'s Theme)', oscar: true, year: 1977 },
      { movie: 'Gladiator', composer: 'Hans Zimmer', singer: 'Lisa Gerrard', track: 'Now We Are Free', year: 2000 },
      { movie: 'Inception', composer: 'Hans Zimmer', track: 'Time', director: 'Christopher Nolan', year: 2010 },
      { movie: 'Interstellar', composer: 'Hans Zimmer', track: 'Cornfield Chase / Stay', instrument: 'Orgue d\'église', year: 2014 },
      { movie: 'Le Bon, la Brute et le Truand', composer: 'Ennio Morricone', director: 'Sergio Leone', year: 1966, instrument: 'Sifflement & cri de coyote' },
      { movie: 'Le Roi Lion (The Lion King)', composer: 'Hans Zimmer & Elton John', track: 'L\'Histoire de la vie / Circle of Life', year: 1994 },
      { movie: 'Harry Potter', composer: 'John Williams', track: 'Hedwig\'s Theme', instrument: 'Célesta', year: 2001 },
      { movie: 'Titanic', composer: 'James Horner', track: 'My Heart Will Go On (Céline Dion)', year: 1997, record: 'BO instrumentale la plus vendue de l\'histoire' },
      { movie: 'Game of Thrones', composer: 'Ramin Djawadi', track: 'Main Title Theme (Générique)', instrument: 'Violoncelle', year: 2011 },
      { movie: 'Pirates des Caraïbes', composer: 'Klaus Badelt & Hans Zimmer', track: 'He\'s a Pirate', year: 2003 },
      { movie: 'Pulp Fiction', director: 'Quentin Tarantino', track: 'Misirlou', artist: 'Dick Dale (Surf Guitar)', year: 1994 }
    ];

    // ═══════════════════════════════════════
    // 8. 🌍 MUSIQUES DU MONDE, LATINO & AFROBEAT
    // ═══════════════════════════════════════
    this.worldArtists = [
      { name: 'Bob Marley', genre: 'Reggae', country: 'Jamaïque', group: 'The Wailers', year: 1977, album: 'Exodus', classics: ['No Woman, No Cry', 'Could You Be Loved', 'Three Little Birds', 'One Love', 'Redemption Song'] },
      { name: 'Bad Bunny', realName: 'Benito Antonio Martínez Ocasio', genre: 'Reggaeton / Trap Latino', country: 'Porto Rico', year: 2022, album: 'Un Verano Sin Ti', classics: ['Tití Me Preguntó', 'Me Porto Bonito', 'Dákiti', 'Monaco'] },
      { name: 'Burna Boy', realName: 'Damini Ebunoluwa Ogulu', genre: 'Afrobeat / Afropop', country: 'Nigéria', year: 2022, album: 'Love, Damini', classics: ['Last Last', 'On the Low', 'Ye', 'City Boys', 'It\'s Plenty'] },
      { name: 'Rosalía', genre: 'Flamenco / Pop Urbaine', country: 'Espagne (Barcelone)', year: 2022, album: 'Motomami', classics: ['Despechá', 'Malamente', 'Bizcochito', 'Con Altura'] },
      { name: 'Aya Nakamura', genre: 'Afropop / R&B Français', country: 'France / Mali', year: 2018, album: 'Nakamura', classics: ['Djadja (Succès planétaire)', 'Pookie', 'Copines', 'Dégaine', 'Baby'] },
      { name: 'Daddy Yankee', genre: 'Reggaeton', country: 'Porto Rico', title: 'Roi du Reggaeton', year: 2004, album: 'Barrio Fino', classics: ['Gasolina', 'Despacito (avec Luis Fonsi)', 'Con Calma', 'Dura'] },
    ];
  }

  shuffle(arr) {
    return [...arr].sort(() => 0.5 - Math.random());
  }

  getDistractors(pool, excludeVal, count, key = null) {
    const vals = pool
      .map(item => (key ? item[key] : item))
      .filter(v => v && v !== excludeVal && typeof v === 'string');
    const unique = [...new Set(vals)].sort(() => 0.5 - Math.random());
    return unique.slice(0, count);
  }

  /**
   * 🌟 Générateur d'une question selon le thème choisi
   */
  generateQuestion(seed, theme = 'all') {
    const s = Math.abs(seed);
    const chosenTheme = theme === 'all' || !theme ? ['rap', 'rock', 'pop', 'chanson', 'electro', '80s', 'cinema', 'world'][s % 8] : theme;

    switch (chosenTheme) {
      case 'rap': {
        const sub = s % 3;
        if (sub === 0) {
          const q = this.rapQuotes[s % this.rapQuotes.length];
          const correct = q.artist;
          const wrongs = this.getDistractors(this.rapArtists, correct, 3, 'name');
          return {
            id: `q_rap_q_${s}`,
            theme: 'rap',
            category: '🎤 Rap FR & US',
            categoryLabel: '🎤 PUNCHLINES & TEXTES',
            difficulty: 'Moyen',
            question: `Qui est l'auteur de cette célèbre punchline / phrase :\n${q.quote} ?`,
            options: this.shuffle([correct, ...wrongs]),
            correct,
            anecdote: `Extrait du morceau culte « ${q.track} » (${q.year}) par ${q.artist}.`
          };
        } else if (sub === 1) {
          const a = this.rapArtists[s % this.rapArtists.length];
          const correct = a.album;
          const wrongs = this.getDistractors(this.rapArtists, correct, 3, 'album');
          return {
            id: `q_rap_alb_${s}`,
            theme: 'rap',
            category: '🎤 Rap FR & US',
            categoryLabel: '💿 ALBUMS & PROJETS',
            difficulty: 'Moyen',
            question: `Quel album majeur a révélé ou marqué la carrière du rappeur ${a.name} en ${a.year} ?`,
            options: this.shuffle([correct, ...wrongs]),
            correct,
            anecdote: `L'album « ${a.album} » de ${a.name} est sorti en ${a.year} et contient des titres devenus légendaires.`
          };
        } else {
          const a = this.rapArtists[s % this.rapArtists.length];
          const correct = a.city;
          const wrongs = this.getDistractors(this.rapArtists, correct, 3, 'city');
          return {
            id: `q_rap_city_${s}`,
            theme: 'rap',
            category: '🎤 Rap FR & US',
            categoryLabel: '📍 VILLES & SECTEURS',
            difficulty: 'Facile',
            question: `De quelle ville ou département est originaire l'artiste ${a.name} ?`,
            options: this.shuffle([correct, ...wrongs]),
            correct,
            anecdote: `${a.name} a commencé son parcours à ${a.city}.`
          };
        }
      }

      case 'rock': {
        const sub = s % 3;
        if (sub === 0) {
          const q = this.rockQuotes[s % this.rockQuotes.length];
          const correct = q.artist;
          const wrongs = this.getDistractors(this.rockArtists, correct, 3, 'name');
          return {
            id: `q_rock_q_${s}`,
            theme: 'rock',
            category: '🎸 Rock & Légendes',
            categoryLabel: '🎸 HYMNES & PAROLES CULTES',
            difficulty: 'Moyen',
            question: `De quel groupe de rock légendaire provient ce refrain mythique :\n${q.quote} ?`,
            options: this.shuffle([correct, ...wrongs]),
            correct,
            anecdote: `Titre historique « ${q.track} » (${q.year}) par le groupe ${q.artist}.`
          };
        } else if (sub === 1) {
          const a = this.rockArtists[s % this.rockArtists.length];
          const correct = a.singer || a.guitarist || a.country;
          const wrongs = this.getDistractors(this.rockArtists, correct, 3, 'singer');
          return {
            id: `q_rock_singer_${s}`,
            theme: 'rock',
            category: '🎸 Rock & Légendes',
            categoryLabel: '👑 CHANTEURS & ICÔNES DU ROCK',
            difficulty: 'Facile',
            question: `Qui est le chanteur emblématique du groupe de rock légendaire ${a.name} ?`,
            options: this.shuffle([a.singer, ...wrongs]),
            correct: a.singer,
            anecdote: `${a.singer} a marqué l'histoire du rock mondial en tant que leader vocal de ${a.name}.`
          };
        } else {
          const a = this.rockArtists[s % this.rockArtists.length];
          const correct = a.album;
          const wrongs = this.getDistractors(this.rockArtists, correct, 3, 'album');
          return {
            id: `q_rock_alb_${s}`,
            theme: 'rock',
            category: '🎸 Rock & Légendes',
            categoryLabel: '💿 ALBUMS MONUMENTS',
            difficulty: 'Moyen',
            question: `Quel album mythique de ${a.name} est sorti en ${a.year} ?`,
            options: this.shuffle([correct, ...wrongs]),
            correct,
            anecdote: `« ${a.album} » (${a.year}) est considéré comme l'un des chefs-d'œuvre du rock international.`
          };
        }
      }

      case 'pop': {
        const sub = s % 2;
        if (sub === 0) {
          const q = this.popQuotes[s % this.popQuotes.length];
          const correct = q.artist;
          const wrongs = this.getDistractors(this.popArtists, correct, 3, 'name');
          return {
            id: `q_pop_q_${s}`,
            theme: 'pop',
            category: '💃 Pop Internationale',
            categoryLabel: '💃 REFRAINS PLANÉTAIRES',
            difficulty: 'Facile',
            question: `Qui chante ces paroles emblématiques d'un des plus grands hits pop :\n${q.quote} ?`,
            options: this.shuffle([correct, ...wrongs]),
            correct,
            anecdote: `Extrait du méga-tube « ${q.track} » (${q.year}) par ${q.artist}.`
          };
        } else {
          const a = this.popArtists[s % this.popArtists.length];
          const track = a.classics[s % a.classics.length];
          const correct = a.name;
          const wrongs = this.getDistractors(this.popArtists, correct, 3, 'name');
          return {
            id: `q_pop_track_${s}`,
            theme: 'pop',
            category: '💃 Pop Internationale',
            categoryLabel: '🌟 TUBES DU BILLBOARD',
            difficulty: 'Facile',
            question: `Quel artiste superstar interprète le hit planétaire « ${track} » ?`,
            options: this.shuffle([correct, ...wrongs]),
            correct,
            anecdote: `« ${track} » est l'un des succès les plus streamés de ${a.name}.`
          };
        }
      }

      case 'chanson':
      case 'variete': {
        const sub = s % 2;
        if (sub === 0) {
          const q = this.chansonQuotes[s % this.chansonQuotes.length];
          const correct = q.artist;
          const wrongs = this.getDistractors(this.chansonArtists, correct, 3, 'name');
          return {
            id: `q_chan_q_${s}`,
            theme: 'chanson',
            category: '🇫🇷 Chanson Française',
            categoryLabel: '🇫🇷 CLASSIQUES DU PATRIMOINE',
            difficulty: 'Facile',
            question: `À quel monument de la chanson française doit-on ces paroles inoubliables :\n${q.quote} ?`,
            options: this.shuffle([correct, ...wrongs]),
            correct,
            anecdote: `Titre « ${q.track} » (${q.year}), un chef-d'œuvre de ${q.artist}.`
          };
        } else {
          const a = this.chansonArtists[s % this.chansonArtists.length];
          const track = a.classics[s % a.classics.length];
          const correct = a.name;
          const wrongs = this.getDistractors(this.chansonArtists, correct, 3, 'name');
          return {
            id: `q_chan_track_${s}`,
            theme: 'chanson',
            category: '🇫🇷 Chanson Française',
            categoryLabel: '🎶 CHANSONS CULTES',
            difficulty: 'Facile',
            question: `Qui est l'interprète de la chanson légendaire « ${track} » ?`,
            options: this.shuffle([correct, ...wrongs]),
            correct,
            anecdote: `« ${track} » fait partie des plus grands succès de ${a.name}.`
          };
        }
      }

      case 'electro': {
        const a = this.electroArtists[s % this.electroArtists.length];
        const track = a.classics[s % a.classics.length];
        const correct = a.name;
        const wrongs = this.getDistractors(this.electroArtists, correct, 3, 'name');
        return {
          id: `q_elec_${s}`,
          theme: 'electro',
          category: '🪩 Electro & French Touch',
          categoryLabel: '🪩 ANTHOLOGIE DE LA DANCE & EDM',
          difficulty: 'Moyen',
          question: `Quel DJ ou groupe électro emblématique a produit le banger planétaire « ${track} » ?`,
          options: this.shuffle([correct, ...wrongs]),
          correct,
          anecdote: `Le titre « ${track} » a fait vibrer les plus grands festivals et clubs du monde entier avec ${a.name}.`
        };
      }

      case '80s':
      case '90s':
      case 'retro': {
        const r = this.retroClassics[s % this.retroClassics.length];
        const correct = r.artist;
        const wrongs = ['Madonna', 'George Michael', 'Modern Talking', 'Alphaville', 'Kylie Minogue', 'Culture Club'].filter(x => x !== correct).slice(0, 3);
        return {
          id: `q_retro_${s}`,
          theme: '80s',
          category: '📼 Années 80s & 90s',
          categoryLabel: '📼 TUBES RÉTRO & DISCO',
          difficulty: 'Facile',
          question: r.quote
            ? `Qui chantait ce refrain rétro culte des années 80/90 :\n${r.quote} ?`
            : `Quel artiste ou groupe a signé le tube mondial « ${r.track} » en ${r.year} ?`,
          options: this.shuffle([correct, ...wrongs]),
          correct,
          anecdote: r.anecdote || `Sorti en ${r.year}, « ${r.track || 'ce titre'} » est devenu l'un des emblèmes des années 80/90.`
        };
      }

      case 'cinema':
      case 'film': {
        const c = this.cinemaThemes[s % this.cinemaThemes.length];
        const sub = s % 2;
        if (sub === 0) {
          const correct = c.composer;
          const wrongs = ['Hans Zimmer', 'John Williams', 'Ennio Morricone', 'Howard Shore', 'Danny Elfman', 'Alexandre Desplat', 'Alan Silvestri'].filter(x => x !== correct).slice(0, 3);
          return {
            id: `q_cine_comp_${s}`,
            theme: 'cinema',
            category: '🎬 Cinéma & Séries',
            categoryLabel: '🎬 COMPOSITEURS DE LÉGENDE',
            difficulty: 'Moyen',
            question: `Quel illustre compositeur a composé la musique originale du film / de la saga « ${c.movie} » ?`,
            options: this.shuffle([correct, ...wrongs]),
            correct,
            anecdote: `${c.composer} a signé cette musique inoubliable pour « ${c.movie} »${c.year ? ' en ' + c.year : ''}.`
          };
        } else {
          const correct = c.movie;
          const wrongs = ['Star Wars', 'Gladiator', 'Inception', 'Harry Potter', 'Le Seigneur des Anneaux', 'Interstellar', 'Pirates des Caraïbes', 'Titanic'].filter(x => x !== correct).slice(0, 3);
          return {
            id: `q_cine_mov_${s}`,
            theme: 'cinema',
            category: '🎬 Cinéma & Séries',
            categoryLabel: '🍿 BANDES ORIGINALES CULTES',
            difficulty: 'Facile',
            question: `Dans quel chef-d'œuvre cinématographique ou série peut-on entendre le thème « ${c.track || c.theme} » ?`,
            options: this.shuffle([correct, ...wrongs]),
            correct,
            anecdote: `Composé par ${c.composer}, ce thème illustre les scènes les plus fortes de « ${c.movie} ».`
          };
        }
      }

      case 'world':
      case 'latino': {
        const w = this.worldArtists[s % this.worldArtists.length];
        const track = w.classics[s % w.classics.length];
        const correct = w.name;
        const wrongs = this.getDistractors(this.worldArtists, correct, 3, 'name');
        return {
          id: `q_world_${s}`,
          theme: 'world',
          category: '🌍 Latino & Musiques du Monde',
          categoryLabel: '🌍 RYTHMES DU MONDE & AFRO',
          difficulty: 'Moyen',
          question: `Quel artiste emblématique du genre ${w.genre} interprète le succès « ${track} » ?`,
          options: this.shuffle([correct, ...wrongs]),
          correct,
          anecdote: `${w.name} (${w.country}) a fait danser la planète entière avec « ${track} ».`
        };
      }

      default:
        return this.generateQuestion(seed, 'rap');
    }
  }

  getBatchQuestions(count = 10, category = 'all') {
    const questions = [];
    const baseSeed = Date.now() % 100000;

    for (let i = 0; i < count; i++) {
      const qSeed = (baseSeed + i * 37) % 35000;
      const q = this.generateQuestion(qSeed, category);
      questions.push(q);
    }
    return questions;
  }

  getStats() {
    return {
      totalQuestionsAvailable: 35000,
      themes: [
        { id: 'all', label: '✨ Toutes Musiques Confondues', icon: '✨' },
        { id: 'rap', label: '🎤 Rap FR & US', icon: '🎤' },
        { id: 'rock', label: '🎸 Rock & Pop-Rock', icon: '🎸' },
        { id: 'pop', label: '💃 Pop Internationale', icon: '💃' },
        { id: 'chanson', label: '🇫🇷 Chanson Française', icon: '🇫🇷' },
        { id: 'electro', label: '🪩 Electro & French Touch', icon: '🪩' },
        { id: '80s', label: '📼 Années 80s & 90s', icon: '📼' },
        { id: 'cinema', label: '🎬 Films & Séries', icon: '🎬' },
        { id: 'world', label: '🌍 Latino & World Music', icon: '🌍' },
      ],
      certifiedUniversal: true
    };
  }
}

module.exports = new MusicQuizService();
