// Base de datos simulada para Beisjoven
// En producción, esto sería PostgreSQL, MongoDB o SQLite

const DB = {
    // Categorías disponibles
    categories: [
        { id: 1, slug: 'lmb', name: 'Liga Mexicana de Beisbol', icon: '⚾' },
        { id: 2, slug: 'mlb', name: 'MLB', icon: '🏆' },
        { id: 3, slug: 'softbol', name: 'Softbol', icon: '🥎' },
        { id: 4, slug: 'seleccion', name: 'Selección México', icon: '🇲🇽' },
        { id: 5, slug: 'ligas-menores', name: 'Ligas Menores', icon: '⭐' },
        { id: 6, slug: 'internacional', name: 'Internacional', icon: '🌎' },
        { id: 7, slug: 'opinion', name: 'Opinión', icon: '💬' }
    ],

    // Equipos LMB
    teams: [
        { id: 1, name: 'Diablos Rojos del México', slug: 'diablos-rojos', city: 'Ciudad de México', wins: 68, losses: 42 },
        { id: 2, name: 'Sultanes de Monterrey', slug: 'sultanes', city: 'Monterrey', wins: 65, losses: 45 },
        { id: 3, name: 'Toros de Tijuana', slug: 'toros', city: 'Tijuana', wins: 62, losses: 48 },
        { id: 4, name: 'Olmecas de Tabasco', slug: 'olmecas', city: 'Villahermosa', wins: 60, losses: 50 },
        { id: 5, name: 'Pericos de Puebla', slug: 'pericos', city: 'Puebla', wins: 58, losses: 52 },
        { id: 6, name: 'Tigres de Quintana Roo', slug: 'tigres', city: 'Cancún', wins: 55, losses: 55 },
        { id: 7, name: 'Saraperos de Saltillo', slug: 'saraperos', city: 'Saltillo', wins: 52, losses: 58 },
        { id: 8, name: 'Acereros de Monclova', slug: 'acereros', city: 'Monclova', wins: 50, losses: 60 }
    ],

    // Autores
    authors: [
        { id: 1, name: 'Carlos Mendoza', slug: 'carlos-mendoza', role: 'Editor en Jefe', avatar: '👨‍💼', bio: 'Periodista deportivo con 15 años de experiencia cubriendo beisbol mexicano.' },
        { id: 2, name: 'María González', slug: 'maria-gonzalez', role: 'Reportera MLB', avatar: '👩‍💻', bio: 'Especialista en cobertura de mexicanos en Grandes Ligas.' },
        { id: 3, name: 'Roberto Silva', slug: 'roberto-silva', role: 'Analista', avatar: '👨‍🏫', bio: 'Ex jugador profesional y analista estadístico.' },
        { id: 4, name: 'Ana Martínez', slug: 'ana-martinez', role: 'Reportera Softbol', avatar: '👩‍🎤', bio: 'Pionera en la cobertura del softbol femenil en México.' }
    ],

    // Artículos
    articles: [
        {
            id: 1,
            slug: 'mexico-se-prepara-clasico-mundial-2026',
            title: 'México Se Prepara para el Clásico Mundial con una Nueva Generación de Talento',
            excerpt: 'La selección nacional integra a jóvenes promesas de las Grandes Ligas y la Liga Mexicana para competir en 2026.',
            content: `
                <p>La Selección Mexicana de Beisbol ha comenzado su preparación para el Clásico Mundial de Beisbol 2026 con una estrategia renovada que apuesta por la juventud sin descuidar la experiencia.</p>
                
                <p>El manager Benji Gil ha convocado a un grupo de 45 jugadores que incluye a prospectos de alto calibre que militan en organizaciones de Grandes Ligas, así como a las estrellas consolidadas de la Liga Mexicana de Beisbol.</p>
                
                <h3>Los Prospectos que Ilusionan</h3>
                
                <p>Entre los nombres que más emoción generan se encuentran varios jóvenes que ya han debutado en MLB o están a las puertas de hacerlo. La nueva generación promete dar batalla a las potencias mundiales.</p>
                
                <p>"Tenemos un grupo muy talentoso y hambriento de gloria", declaró Gil en conferencia de prensa. "México tiene la capacidad de competir contra cualquier selección del mundo".</p>
                
                <h3>Calendario de Preparación</h3>
                
                <p>El equipo sostendrá una serie de partidos amistosos durante los próximos meses, incluyendo enfrentamientos contra selecciones de Centroamérica y el Caribe, así como juegos de exhibición contra equipos de la Liga Mexicana del Pacífico.</p>
                
                <p>La sede del campamento de entrenamiento será el Estadio Alfredo Harp Helú en la Ciudad de México, casa de los Diablos Rojos.</p>
            `,
            categoryId: 4,
            authorId: 1,
            image: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=600&fit=crop',
            featured: true,
            views: 15420,
            publishedAt: '2025-01-14T10:00:00Z',
            tags: ['Clásico Mundial', 'Selección Mexicana', 'WBC 2026']
        },
        {
            id: 2,
            slug: 'mexicanos-grandes-ligas-temporada-2025',
            title: 'Mexicanos en Grandes Ligas: La Temporada que Viene',
            excerpt: 'Un repaso por los peloteros aztecas que buscarán brillar en la MLB esta temporada.',
            content: `
                <p>La temporada 2025 de las Grandes Ligas promete ser especial para el beisbol mexicano, con una cantidad récord de jugadores aztecas en rosters de 40 hombres.</p>
                
                <p>Desde pitchers dominantes hasta bateadores de poder, México estará representado en ambas ligas con talento de primer nivel.</p>
                
                <h3>Los Estelares</h3>
                
                <p>Julio Urías busca su regreso triunfal después de una temporada complicada, mientras que otros lanzadores mexicanos consolidan su lugar en rotaciones estelares.</p>
                
                <p>En el lineup, varios bateadores mexicanos vienen de temporadas productivas y buscan superar sus números.</p>
                
                <h3>Los Prospectos a Seguir</h3>
                
                <p>Las organizaciones de MLB tienen en sus sistemas de menores a varios mexicanos considerados entre los mejores prospectos. Algunos podrían debutar este mismo año.</p>
            `,
            categoryId: 2,
            authorId: 2,
            image: 'https://images.unsplash.com/photo-1529768167801-9173d94c2a42?w=800&h=600&fit=crop',
            featured: true,
            views: 12350,
            publishedAt: '2025-01-14T08:30:00Z',
            tags: ['MLB', 'Mexicanos', 'Temporada 2025']
        },
        {
            id: 3,
            slug: 'seleccion-femenil-softbol-panamericanos',
            title: 'Selección Femenil Anuncia Roster para Panamericanos',
            excerpt: 'El equipo mexicano de softbol define su plantilla para buscar la medalla de oro.',
            content: `
                <p>La Federación Mexicana de Softbol dio a conocer la lista de 15 jugadoras que representarán al país en los próximos Juegos Panamericanos.</p>
                
                <p>El roster combina experiencia internacional con jóvenes talentos que han destacado en las ligas universitarias de Estados Unidos.</p>
                
                <h3>Las Veteranas</h3>
                
                <p>El equipo cuenta con varias jugadoras que han participado en múltiples competencias internacionales, incluyendo Juegos Olímpicos y Campeonatos Mundiales.</p>
                
                <h3>Sangre Nueva</h3>
                
                <p>Tres jugadoras harán su debut internacional, todas provenientes de programas universitarios de la NCAA donde han brillado en sus respectivos equipos.</p>
                
                <p>"Este es el equipo más completo que hemos tenido en años", aseguró la entrenadora nacional. "Tenemos poder, velocidad y una pitchera dominante".</p>
            `,
            categoryId: 3,
            authorId: 4,
            image: 'https://images.unsplash.com/photo-1544189777-ffe07c59252e?w=800&h=600&fit=crop',
            featured: true,
            views: 8920,
            publishedAt: '2025-01-13T16:00:00Z',
            tags: ['Softbol', 'Panamericanos', 'Selección Femenil']
        },
        {
            id: 4,
            slug: 'diablos-rojos-nueva-alineacion-2025',
            title: 'Diablos Rojos Presenta su Nueva Alineación para la Temporada 2025',
            excerpt: 'El equipo capitalino reveló sus refuerzos y la estrategia para defender el título.',
            content: `
                <p>Los Diablos Rojos del México presentaron oficialmente su roster para la temporada 2025 de la Liga Mexicana de Beisbol, con varias incorporaciones de impacto.</p>
                
                <p>El equipo campeón defensor llega con hambre de repetir y ha reforzado tanto su rotación de pitcheo como su lineup ofensivo.</p>
                
                <h3>Los Refuerzos</h3>
                
                <p>La directiva concretó la llegada de dos bateadores con experiencia en ligas asiáticas y un pitcher que viene de dominar en la Liga del Pacífico.</p>
                
                <h3>La Base del Campeonato</h3>
                
                <p>El núcleo del equipo campeón se mantiene intacto, con los líderes del vestidor renovando sus contratos por múltiples temporadas.</p>
                
                <p>"Queremos hacer historia y ganar títulos consecutivos", declaró el mánager en la presentación. "Este roster tiene todo para lograrlo".</p>
            `,
            categoryId: 1,
            authorId: 1,
            image: 'https://images.unsplash.com/photo-1562771379-eafdca7a02f8?w=800&h=600&fit=crop',
            featured: false,
            views: 9540,
            publishedAt: '2025-01-14T14:00:00Z',
            tags: ['Diablos Rojos', 'LMB', 'Temporada 2025']
        },
        {
            id: 5,
            slug: 'sultanes-monterrey-renueva-estrellas',
            title: 'Sultanes de Monterrey Renueva a sus Estrellas por Tres Años',
            excerpt: 'El equipo regiomontano asegura a sus mejores jugadores con contratos a largo plazo.',
            content: `
                <p>Los Sultanes de Monterrey anunciaron la extensión de contrato de sus tres jugadores más valiosos, asegurando el núcleo del equipo para las próximas temporadas.</p>
                
                <p>La inversión representa una de las más grandes en la historia reciente de la Liga Mexicana de Beisbol.</p>
                
                <h3>Compromiso a Largo Plazo</h3>
                
                <p>Los contratos incluyen cláusulas de no intercambio y bonos por rendimiento, demostrando el compromiso de la organización con sus estrellas.</p>
                
                <p>"Monterrey es mi casa y aquí quiero retirarme", declaró el líder del equipo durante la conferencia de prensa.</p>
            `,
            categoryId: 1,
            authorId: 3,
            image: 'https://images.unsplash.com/photo-1578432014316-48b448d79d57?w=800&h=600&fit=crop',
            featured: false,
            views: 7230,
            publishedAt: '2025-01-13T12:00:00Z',
            tags: ['Sultanes', 'LMB', 'Contratos']
        },
        {
            id: 6,
            slug: 'toros-tijuana-academia-desarrollo',
            title: 'Toros de Tijuana Inaugura Nueva Academia de Desarrollo',
            excerpt: 'Las instalaciones de primer nivel buscan formar a la próxima generación de talento fronterizo.',
            content: `
                <p>Los Toros de Tijuana inauguraron su nueva academia de desarrollo, una instalación de primer mundo que busca convertirse en semillero de talento para la organización.</p>
                
                <p>El complejo cuenta con campos de entrenamiento, gimnasio, dormitorios y áreas de análisis de video con tecnología de punta.</p>
                
                <h3>Inversión en el Futuro</h3>
                
                <p>La academia representa una inversión millonaria y albergará a más de 50 jóvenes prospectos de manera permanente.</p>
                
                <p>"Queremos que los mejores talentos de la frontera se desarrollen aquí", explicó el director de operaciones del equipo.</p>
            `,
            categoryId: 1,
            authorId: 1,
            image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&h=600&fit=crop',
            featured: false,
            views: 5670,
            publishedAt: '2025-01-12T10:00:00Z',
            tags: ['Toros', 'Academia', 'Desarrollo']
        },
        {
            id: 7,
            slug: 'mexico-busca-oro-mundial-softbol',
            title: 'México Busca el Oro en el Mundial de Softbol Femenil',
            excerpt: 'La selección nacional llega como una de las favoritas al campeonato mundial.',
            content: `
                <p>La Selección Mexicana de Softbol Femenil se ha posicionado como una de las favoritas para el próximo Campeonato Mundial de la disciplina.</p>
                
                <p>Con un roster plagado de talento y experiencia internacional, el equipo azteca buscará su primera medalla de oro en la historia.</p>
                
                <h3>El Camino al Oro</h3>
                
                <p>México quedó en el Grupo B junto a Japón, Canadá y Australia, un grupo exigente que requerirá el mejor beisbol desde el primer juego.</p>
                
                <p>La pitchera estelar del equipo viene de una temporada dominante en la liga profesional japonesa.</p>
            `,
            categoryId: 3,
            authorId: 4,
            image: 'https://images.unsplash.com/photo-1594037834338-58c2b2a0e4c4?w=800&h=600&fit=crop',
            featured: false,
            views: 6890,
            publishedAt: '2025-01-14T09:00:00Z',
            tags: ['Softbol', 'Mundial', 'Selección Femenil']
        },
        {
            id: 8,
            slug: 'top-10-prospectos-mexicanos-mlb-2025',
            title: 'Los 10 Mexicanos a Seguir en la Temporada 2025 de MLB',
            excerpt: 'Un repaso completo por los peloteros aztecas que buscarán brillar en las Grandes Ligas.',
            content: `
                <p>La temporada 2025 de MLB tendrá una fuerte presencia mexicana. Estos son los 10 jugadores que debes seguir de cerca.</p>
                
                <h3>1. El Pitcher Estelar</h3>
                <p>Después de firmar un contrato millonario, buscará demostrar que vale cada centavo con una temporada dominante.</p>
                
                <h3>2. El Bateador de Poder</h3>
                <p>Viene de conectar más de 30 jonrones y apunta a superar esa marca en 2025.</p>
                
                <h3>3-10. Los Demás Destacados</h3>
                <p>Desde relevistas dominantes hasta utilidades versátiles, México tendrá representación en todos los roles.</p>
            `,
            categoryId: 2,
            authorId: 2,
            image: 'https://images.unsplash.com/photo-1531747118685-ca8fa6e08806?w=800&h=600&fit=crop',
            featured: false,
            views: 11200,
            publishedAt: '2025-01-13T14:00:00Z',
            tags: ['MLB', 'Top 10', 'Mexicanos']
        },
        {
            id: 9,
            slug: 'japon-estados-unidos-ranking-mundial',
            title: 'Japón y Estados Unidos Encabezan el Ranking Mundial de Beisbol',
            excerpt: 'La WBSC actualiza su ranking con México en el top 10 previo al próximo Clásico Mundial.',
            content: `
                <p>La Confederación Mundial de Beisbol y Softbol (WBSC) publicó su más reciente actualización del ranking mundial, donde México se mantiene entre los mejores 10 países.</p>
                
                <p>Japón lidera la clasificación tras su victoria en el último Clásico Mundial, seguido de cerca por Estados Unidos.</p>
                
                <h3>La Posición de México</h3>
                
                <p>El equipo mexicano subió dos posiciones gracias a sus resultados en torneos clasificatorios y la Serie del Caribe.</p>
                
                <p>El ranking será clave para el sorteo de grupos del próximo Clásico Mundial 2026.</p>
            `,
            categoryId: 6,
            authorId: 3,
            image: 'https://images.unsplash.com/photo-1508344928928-7165b0a59c0e?w=800&h=600&fit=crop',
            featured: false,
            views: 4560,
            publishedAt: '2025-01-12T16:00:00Z',
            tags: ['WBSC', 'Ranking', 'Internacional']
        },
        {
            id: 10,
            slug: 'analisis-porque-mexico-puede-ganar-clasico',
            title: '¿Por Qué México Puede Ganar el Clásico Mundial 2026?',
            excerpt: 'Un análisis profundo de las fortalezas del equipo mexicano de cara al torneo.',
            content: `
                <p>México nunca ha ganado el Clásico Mundial de Beisbol, pero 2026 podría ser el año. Aquí explicamos por qué.</p>
                
                <h3>Pitcheo de Élite</h3>
                <p>Por primera vez, México cuenta con múltiples lanzadores que podrían ser abridores en cualquier rotación de Grandes Ligas.</p>
                
                <h3>Profundidad Ofensiva</h3>
                <p>El lineup mexicano no tiene huecos. De arriba a abajo, cada bateador representa una amenaza.</p>
                
                <h3>Experiencia Internacional</h3>
                <p>La mayoría del roster ha participado en múltiples torneos internacionales, incluyendo Clásicos Mundiales anteriores.</p>
                
                <h3>Conclusión</h3>
                <p>Si las estrellas se alinean y los jugadores llegan sanos, México tiene todo para hacer historia en 2026.</p>
            `,
            categoryId: 7,
            authorId: 3,
            image: 'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=800&h=600&fit=crop',
            featured: false,
            views: 8900,
            publishedAt: '2025-01-11T10:00:00Z',
            tags: ['Opinión', 'Clásico Mundial', 'Análisis']
        },
        {
            id: 11,
            slug: 'ligas-pequenas-beisbol-mexico-sedes-torneos-2026',
            title: 'Ligas Pequeñas de Béisbol en México: Sedes y Calendario de Torneos 2026',
            excerpt: 'Con más de 200 ligas en seis regiones, las Ligas Pequeñas de Béisbol de México definen sus sedes y calendario rumbo a Williamsport 2026.',
            content: `
                <p>Las Ligas Pequeñas de Béisbol de México (LPB México), con más de seis décadas de historia formando a las futuras estrellas del diamante, ya trabajan a todo vapor en la organización de su temporada de torneos 2026. Con más de 200 ligas distribuidas en seis regiones, 25 distritos y miles de niños y jóvenes participantes, el circuito de ligas pequeñas sigue siendo el semillero más importante del béisbol mexicano.</p>

                <h3>El Congreso Nacional que Dio el Banderazo</h3>

                <p>En diciembre de 2025, la ciudad de Boca del Río, Veracruz, fue sede del Congreso de la Región 6 de Béisbol de Ligas Pequeñas "Rumbo a Williamsport". En este encuentro se dieron cita las ligas de los estados del centro, sur y sureste del país para definir sedes, categorías y calendarios de los torneos regionales y nacionales de 2026.</p>

                <p>"Somos la región más grande de las seis, con casi 16 estados y más de 35 ligas. Veracruz fue sede y recibió la asignación de varios torneos", señaló Jorge Gamboa, directivo de Mérida, Yucatán, durante el congreso.</p>

                <p>Paralelamente, el 5 de diciembre se celebró el Congreso Nacional de Ligas Pequeñas de México, donde se designaron oficialmente las sedes para los torneos regionales y nacionales de la temporada 2026.</p>

                <h3>Las Seis Regiones de LPB México</h3>

                <p>La organización de Ligas Pequeñas en México se divide en seis regiones, cada una con directores regionales y distritales que coordinan los torneos locales:</p>

                <ul>
                    <li><strong>Región 1 (Nuevo León):</strong> La más concentrada, con 58 ligas y 8 distritos en un solo estado. Monterrey es históricamente una de las principales sedes de torneos nacionales.</li>
                    <li><strong>Región 2 (Noroeste):</strong> Incluye Sonora, Baja California, Baja California Sur, Sinaloa y Chihuahua. Hermosillo, Mexicali y Los Mochis son sedes frecuentes de torneos regionales.</li>
                    <li><strong>Región 3 (Noreste):</strong> Comprende Tamaulipas, Coahuila y estados aledaños. Reynosa, Matamoros y Nuevo Laredo han albergado torneos nacionales en años recientes.</li>
                    <li><strong>Región 4 (Centro-Norte):</strong> Abarca estados del centro y norte como Durango, Aguascalientes y San Luis Potosí.</li>
                    <li><strong>Región 5 (Centro-Occidente):</strong> Incluye Jalisco, Michoacán, Guanajuato y estados aledaños.</li>
                    <li><strong>Región 6 (Centro-Sur y Sureste):</strong> La más extensa, con casi 16 estados que incluyen Veracruz, Yucatán, Tabasco, Oaxaca, Puebla y más.</li>
                </ul>

                <h3>Categorías: Desde los 3 Hasta los 18 Años</h3>

                <p>Uno de los grandes atractivos de las Ligas Pequeñas es la amplitud de categorías que permiten que niños desde los 3 años comiencen su camino en el béisbol organizado:</p>

                <ul>
                    <li><strong>Biberones:</strong> 3-4 años (iniciación al béisbol)</li>
                    <li><strong>Pre-Moyote:</strong> 5-6 años</li>
                    <li><strong>Moyote:</strong> 7-8 años</li>
                    <li><strong>Pequeña (9-10):</strong> 9-10 años</li>
                    <li><strong>Pequeña (11-12):</strong> 11-12 años — la categoría "reina", con boleto directo a la Serie Mundial de Williamsport</li>
                    <li><strong>Intermedia:</strong> 11-13 años (modalidad 50/70)</li>
                    <li><strong>Junior:</strong> 13-14 años</li>
                    <li><strong>Senior:</strong> 15-16 años</li>
                    <li><strong>Big League:</strong> 17-18 años</li>
                </ul>

                <h3>Sedes Clave para los Torneos Nacionales 2026</h3>

                <p>Siguiendo la tradición de años anteriores, diversas ciudades del país se preparan para recibir los torneos nacionales por categoría. Aunque las sedes definitivas se confirman tras los congresos regionales, estas son las ciudades que históricamente han sido pilares de los torneos y que se perfilan para 2026:</p>

                <ul>
                    <li><strong>Monterrey, Nuevo León:</strong> Sede habitual de torneos nacionales en categorías Biberones, Moyote y Senior. La Región 1 tiene seis campeonatos mundiales en su historia, incluyendo tres en Williamsport.</li>
                    <li><strong>Hermosillo, Sonora:</strong> Capital del softbol de Ligas Pequeñas y sede recurrente de torneos regionales de béisbol.</li>
                    <li><strong>Matamoros, Tamaulipas:</strong> Sede tradicional del torneo nacional de la categoría 11-12 años, la que otorga el boleto a Williamsport.</li>
                    <li><strong>Reynosa y Nuevo Laredo, Tamaulipas:</strong> Sedes de torneos nacionales en categorías Pre-Moyote e Intermedia.</li>
                    <li><strong>Boca del Río, Veracruz:</strong> Con el impulso del congreso regional, se perfila como sede de múltiples torneos de la Región 6.</li>
                    <li><strong>Mexicali, Baja California:</strong> Sede frecuente de regionales en la categoría 9-10 años.</li>
                </ul>

                <h3>El Camino a Williamsport 2026</h3>

                <p>El objetivo máximo de las Ligas Pequeñas en México es clasificar a la Serie Mundial de Pequeñas Ligas (Little League World Series), que se celebrará del 19 al 30 de agosto de 2026 en South Williamsport, Pensilvania. El camino para llegar ahí sigue una ruta eliminatoria:</p>

                <ul>
                    <li><strong>Torneos Distritales:</strong> Los equipos All-Star de cada liga compiten a nivel distrito (mayo-junio).</li>
                    <li><strong>Torneos Seccionales:</strong> Los ganadores distritales avanzan a la fase seccional (junio).</li>
                    <li><strong>Torneos Regionales:</strong> Los mejores equipos de cada región se enfrentan por el pase al nacional (junio-julio).</li>
                    <li><strong>Torneo Nacional:</strong> El campeón nacional de la categoría 11-12 años obtiene el boleto directo a Williamsport (julio).</li>
                    <li><strong>Serie Mundial en Williamsport:</strong> 19-30 de agosto de 2026, en los estadios Howard J. Lamade y Little League Volunteer Stadium.</li>
                </ul>

                <h3>Calendario General de Series Mundiales 2026</h3>

                <p>Little League International ya confirmó las fechas de sus siete Series Mundiales para 2026:</p>

                <ul>
                    <li><strong>Senior League Baseball:</strong> 1-8 de agosto — Easley, Carolina del Sur</li>
                    <li><strong>Intermediate (50/70) Baseball:</strong> 2-9 de agosto — Livermore, California</li>
                    <li><strong>Junior League Baseball:</strong> 9-16 de agosto — Taylor, Michigan</li>
                    <li><strong>Little League Baseball (11-12):</strong> 19-30 de agosto — Williamsport, Pensilvania</li>
                </ul>

                <p>México cuenta con un historial brillante en Williamsport: la Liga Industrial de Monterrey ganó títulos mundiales en 1957 y 1958, y la Liga Pequeña Linda Vista de Monterrey lo hizo en 1997. A esto se suma la participación de la Liga de Mexicali, campeona en la categoría de 13 años en 1988.</p>

                <h3>Más que Competencia: Formación Integral</h3>

                <p>Las Ligas Pequeñas de Béisbol de México no solo buscan formar grandes peloteros. Su misión fundamental es contribuir al desarrollo integral de niños y adolescentes a través de la práctica organizada del béisbol, inculcando valores como el trabajo en equipo, la disciplina y el respeto.</p>

                <p>Con más de 200 ligas activas en todo el país, la temporada 2026 promete ser una de las más competitivas. Los ojos del béisbol infantil mexicano ya están puestos en Williamsport.</p>
            `,
            categoryId: 5,
            authorId: 1,
            image: 'https://images.unsplash.com/photo-1631224407929-730b1a60f83e?w=800&h=600&fit=crop',
            featured: true,
            views: 3250,
            publishedAt: '2026-02-10T09:00:00Z',
            tags: ['Ligas Pequeñas', 'Williamsport', 'Torneos 2026', 'Béisbol Infantil']
        }
    ],

    // Videos
    videos: [
        {
            id: 1,
            slug: 'entrevista-manager-seleccion',
            title: 'Conversamos con el Manager de la Selección Mexicana sobre el Clásico Mundial 2026',
            duration: '12:45',
            thumbnail: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=500&fit=crop',
            videoUrl: '#',
            views: 24500,
            categoryId: 4,
            featured: true,
            isLive: false,
            publishedAt: '2025-01-14T12:00:00Z'
        },
        {
            id: 2,
            slug: 'top-10-jugadas-semana-lmb',
            title: 'Top 10: Mejores Jugadas de la Semana en la LMB',
            duration: '8:32',
            thumbnail: 'https://images.unsplash.com/photo-1529768167801-9173d94c2a42?w=400&h=300&fit=crop',
            videoUrl: '#',
            views: 18200,
            categoryId: 1,
            featured: false,
            isLive: false,
            publishedAt: '2025-01-13T18:00:00Z'
        },
        {
            id: 3,
            slug: 'analisis-prospectos-mexicanos-mlb',
            title: 'Análisis: ¿Quiénes son los Prospectos Mexicanos para MLB 2025?',
            duration: '15:20',
            thumbnail: 'https://images.unsplash.com/photo-1578432014316-48b448d79d57?w=400&h=300&fit=crop',
            videoUrl: '#',
            views: 12800,
            categoryId: 2,
            featured: false,
            isLive: false,
            publishedAt: '2025-01-12T14:00:00Z'
        },
        {
            id: 4,
            slug: 'resumen-mexico-japon-softbol',
            title: 'Resumen: México vs Japón - Partido Amistoso de Softbol',
            duration: '6:15',
            thumbnail: 'https://images.unsplash.com/photo-1544189777-ffe07c59252e?w=400&h=300&fit=crop',
            videoUrl: '#',
            views: 9400,
            categoryId: 3,
            featured: false,
            isLive: false,
            publishedAt: '2025-01-11T20:00:00Z'
        },
        {
            id: 5,
            slug: 'documental-diablos-rojos',
            title: 'Documental: La Historia de los Diablos Rojos del México',
            duration: '22:08',
            thumbnail: 'https://images.unsplash.com/photo-1562771379-eafdca7a02f8?w=400&h=300&fit=crop',
            videoUrl: '#',
            views: 45100,
            categoryId: 1,
            featured: false,
            isLive: false,
            publishedAt: '2025-01-07T10:00:00Z'
        }
    ],

    // ==================== STREAMS EN VIVO ====================
    // Datos para la sección En Vivo
    streams: [
        {
            id: 1,
            title: 'México vs República Dominicana - Serie del Caribe 2025',
            description: 'Partido de la fase de grupos de la Serie del Caribe. La selección mexicana busca avanzar a semifinales.',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Video de prueba
            thumbnail: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&h=450&fit=crop',
            status: 'replay', // 'live', 'upcoming', 'replay'
            categoryId: 4,
            views: 125000,
            duration: '3:24:15',
            publishedAt: '2025-01-18T20:00:00Z',
            scheduledAt: null
        },
        {
            id: 2,
            title: 'Diablos Rojos vs Sultanes - Juego 1 Serie Final LMB',
            description: 'El primer juego de la serie final de la Liga Mexicana de Beisbol. Los campeones defensores reciben a Monterrey.',
            url: 'https://vimeo.com/824804225', // Video de prueba Vimeo
            thumbnail: 'https://images.unsplash.com/photo-1562771379-eafdca7a02f8?w=800&h=450&fit=crop',
            status: 'replay',
            categoryId: 1,
            views: 89000,
            duration: '2:58:42',
            publishedAt: '2025-01-15T19:00:00Z',
            scheduledAt: null
        },
        {
            id: 3,
            title: 'Selección Femenil de Softbol - Entrenamiento Abierto',
            description: 'Transmisión del entrenamiento previo a los Juegos Panamericanos.',
            url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', // Video de prueba
            thumbnail: 'https://images.unsplash.com/photo-1544189777-ffe07c59252e?w=800&h=450&fit=crop',
            status: 'replay',
            categoryId: 3,
            views: 34500,
            duration: '1:45:00',
            publishedAt: '2025-01-12T16:00:00Z',
            scheduledAt: null
        },
        {
            id: 4,
            title: 'México vs Japón - Amistoso Internacional',
            description: 'Partido amistoso de preparación para el Clásico Mundial 2026.',
            url: 'https://www.youtube.com/watch?v=L_jWHffIx5E', // Video de prueba
            thumbnail: 'https://images.unsplash.com/photo-1529768167801-9173d94c2a42?w=800&h=450&fit=crop',
            status: 'upcoming',
            categoryId: 4,
            views: 0,
            duration: null,
            publishedAt: null,
            scheduledAt: '2025-01-25T18:00:00Z'
        },
        {
            id: 5,
            title: 'Final Torneo Nacional de Softbol Femenil',
            description: 'Las mejores selecciones estatales se enfrentan por el título nacional.',
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            thumbnail: 'https://images.unsplash.com/photo-1578432014316-48b448d79d57?w=800&h=450&fit=crop',
            status: 'upcoming',
            categoryId: 3,
            views: 0,
            duration: null,
            publishedAt: null,
            scheduledAt: '2025-01-28T17:00:00Z'
        },
        {
            id: 6,
            title: 'Top 10 Jugadas de la Semana LMB',
            description: 'Recopilación de las mejores jugadas de la semana en la Liga Mexicana.',
            url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
            thumbnail: 'https://images.unsplash.com/photo-1508344928928-7165b0a59c0e?w=800&h=450&fit=crop',
            status: 'replay',
            categoryId: 1,
            views: 67800,
            duration: '12:35',
            publishedAt: '2025-01-10T14:00:00Z',
            scheduledAt: null
        },
        {
            id: 7,
            title: 'Conferencia de Prensa - Selección Mexicana WBC 2026',
            description: 'El manager y jugadores hablan sobre la preparación para el Clásico Mundial.',
            url: 'https://www.youtube.com/watch?v=L_jWHffIx5E',
            thumbnail: 'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?w=800&h=450&fit=crop',
            status: 'replay',
            categoryId: 4,
            views: 45200,
            duration: '48:22',
            publishedAt: '2025-01-08T12:00:00Z',
            scheduledAt: null
        }
    ]
};

// Exportar para uso en el navegador
if (typeof window !== 'undefined') {
    window.DB = DB;
}

// Exportar para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DB;
}
