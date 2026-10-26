import React, { useEffect, useState } from 'react';
import Head from 'next/head';

const Landing = () => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const toggleMenu = () => {
		setIsMenuOpen(!isMenuOpen);
	};

	// Effect for scroll-fade animation
	useEffect(() => {
		const fadeInElements = document.querySelectorAll('.fade-in');
		const observer = new IntersectionObserver(entries => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					entry.target.classList.add('visible');
				}
			});
		}, { threshold: 0.12 });

		fadeInElements.forEach(el => observer.observe(el));

		return () => {
			fadeInElements.forEach(el => observer.unobserve(el));
		};
	}, []);

	// Effect for header darken on scroll
	useEffect(() => {
		const handleScroll = () => {
			const header = document.querySelector('header') as HTMLElement;
			if (header) {
				header.style.background = window.scrollY > 60 ? 'rgba(4,9,15,.99)' : 'rgba(13,36,68,.97)';
			}
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	// Effect for active navigation link on scroll
	useEffect(() => {
		const sections = document.querySelectorAll<HTMLElement>('section[id]');
		const handleScroll = () => {
			let currentSectionId = '';
			sections.forEach(s => {
				if (window.scrollY >= s.offsetTop - 140) {
					currentSectionId = s.id;
				}
			});
			document.querySelectorAll('.nav-links a').forEach(a => {
				if (a.getAttribute('href') === '#' + currentSectionId) {
					(a as HTMLElement).style.color = '#C9A84C';
				} else {
					(a as HTMLElement).style.color = '';
				}
			});
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	// Function for sending message (form submission)
	const sendMessage = () => {
		const formMsg = document.getElementById('form-msg') as HTMLElement;
		if (formMsg) {
			formMsg.style.display = 'block';
			setTimeout(() => formMsg.style.display = 'none', 5000);
		}
	};

	// Particles effect
	useEffect(() => {
		const container = document.getElementById('particles');
		if (container) {
			for (let i = 0; i < 28; i++) {
				const p = document.createElement('div');
				p.className = 'particle';
				p.style.left = Math.random() * 100 + '%';
				p.style.width = p.style.height = (Math.random() * 3 + 1) + 'px';
				p.style.animationDuration = (Math.random() * 12 + 8) + 's';
				p.style.animationDelay = (Math.random() * 12) + 's';
				container.appendChild(p);
			}
		}
		return () => {
			if (container) {
				container.innerHTML = '';
			}
		};
	}, []);


	return (
		<>
			<Head>
				<title>MSFS e.V. – Kongregation der Missionare des Hl. Franz von Sales</title>
				<meta charSet="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			</Head>

			{/* HEADER */}
			<header className="landing-header">
				<div className="header-info">
					<span>&#128205; Bergstrasse 4, 87466 Oy-Mittelberg, Deutschland</span>
					<span>
						<a href="mailto:gamsfs2025@gmail.com">&#9993; gamsfs2025@gmail.com</a>
						&nbsp;|&nbsp;
						<a href="tel:+4915129052589">&#128222; +49 151 29052589</a>
					</span>
				</div>
				<div className="german-strip"></div>
				<nav className="landing-nav">
					<a href="#home" className="nav-logo">
						<img src="assets/logo.png" alt="MSFS Logo" />
						<div className="nav-logo-text">
							<div className="org-name">Kongregation der Missionare des Hl. Franz von Sales (MSFS) e.V.</div>
							<div className="org-short">MSFS e.V. Deutschland</div>
						</div>
					</a>
					<div className="hamburger" onClick={toggleMenu}><span></span><span></span><span></span></div>
					<ul className={`nav-links ${isMenuOpen ? 'open' : ''}`} id="navLinks">
						<li><a href="#home">Home</a></li>
						<li><a href="#about">Über Uns</a></li>
						<li><a href="#history">Geschichte</a></li>
						<li><a href="#mission">Mission</a></li>
						<li><a href="#provinces">Provinzen</a></li>
						<li><a href="#projects">Projekte</a></li>
						<li><a href="#gallery">Galerie</a></li>
						<li><a href="#ourfathers">Unsere Väter</a></li>
						<li><a href="#contact" className="btn-contact">Kontakt</a></li>
					</ul>
				</nav>
			</header>

			{/* HERO */}
			<section id="home">
				<div className="hero-particles" id="particles"></div>
				<div className="hero-cross">&#10011;</div>
				<div className="hero-content">
					<img src="assets/logo.png" alt="MSFS Logo" className="hero-logo" />
					<div className="hero-eyebrow">Kongregation der Missionare · Deutschland</div>
					<h1 className="hero-title">
						<span>Missionare des</span><br />
						<span style={{ color: 'var(--gold)' }}>Hl Franz von Sales</span>
					</h1>
					<div className="hero-orgname">Kongregation der Missionare des Hl. Franz von Sales (MSFS) e.V.</div>
					<p className="hero-subtitle">Eingetragener gemeinnütziger Verein · Deutschland</p>
					<div className="hero-quote">
						&#8222;Tue alles durch Liebe und nichts durch Zwang. Die Liebe vermag mehr als die Gewalt.&#8220;
						<br /><em>&mdash; Hl. Franz von Sales</em>
					</div>
					<div className="hero-buttons">
						<a href="#about" className="btn-primary">Mehr erfahren</a>
						<a href="#contact" className="btn-outline">Kontakt aufnehmen</a>
					</div>
				</div>
			</section>

			{/* TICKER */}
			<div className="ticker-wrap">
				<div className="ticker">
					&#10022; Willkommen bei MSFS Deutschland &nbsp;&nbsp;&nbsp; &#10022; Kongregation der Missionare des Hl.
					Franz von Sales (MSFS) e.V. &nbsp;&nbsp;&nbsp; &#10022; Bergstrasse 4, 87466 Oy-Mittelberg
					&nbsp;&nbsp;&nbsp; &#10022; Gemeinn&#252;tziger Verein e.V. &nbsp;&nbsp;&nbsp; &#10022; &#8222;Tue alles
					durch Liebe&#8220; &mdash; Hl. Franz von Sales &nbsp;&nbsp;&nbsp; &#10022; Di&#246;zesen: Augsburg &bull;
					Bamberg &bull; M&#252;nchen &bull; M&#252;nster &bull; Passau &bull; Regensburg &bull; W&#252;rzburg
					&nbsp;&nbsp;&nbsp; &#10022; MSFS: 31 L&#228;nder &bull; 11 Provinzen &bull; 1233 Priester &nbsp;&nbsp;&nbsp;
				</div>
			</div>

			{/* ABOUT */}
			<section id="about">
				<div className="container">
					<div className="about-grid">
						<div className="about-image fade-in">
							<img src="assets/francis.png" alt="Heiliger Franz von Sales" />
							<div className="about-badge">Patron &amp; Namenspatron</div>
						</div>
						<div className="about-text fade-in">
							<span className="section-label">Über uns</span>
							<h2 className="section-title">Wer wir sind</h2>
							<div className="section-divider"></div>
							<p>Die <strong>Kongregation der Missionare des Heiligen Franz von Sales (MSFS)</strong> &ndash; auch
								bekannt als die <em>Fransalianer</em> &ndash; ist eine weltweit t&#228;tige katholische
								Ordensgemeinschaft, gegr&#252;ndet 1838 von Fr. Peter Marie Mermier in Annecy, Frankreich.</p>
							<p>In Deutschland sind wir als eingetragener gemeinn&#252;tziger Verein (<strong>e.V.</strong>)
								t&#228;tig und engagieren uns f&#252;r Seelsorge, Missionst&#228;tigkeit, soziale Projekte und
								die F&#246;rderung des geistlichen Lebens im Geiste des Heiligen Franz von Sales.</p>
							<p>Unser Patron, der Heilige Franz von Sales (1567&ndash;1622), war Bischof von Genf und Doktor der
								Kirche. Er ist bekannt f&#252;r sein Werk <em>&#8222;Anleitung zum frommen Leben&#8220;</em>
								(Introduction to the Devout Life).</p>
							<p>Als Teil der weltweiten MSFS-Gemeinschaft sind in Deutschland Missionare aus verschiedenen
								Provinzen Indiens t&#228;tig und dienen in mehreren deutschen Di&#246;zesen.</p>
							<a href="https://msfs.org" target="_blank" className="btn-primary"
								style={{ display: 'inline-block', marginTop: '12px' }}>Weltweite MSFS &#8599;</a>
						</div>
					</div>
				</div>
			</section>

			{/* GERMANY BAND */}
			<div className="germany-band fade-in">
				<div className="germany-flag">
					<svg className="flag-svg" viewBox="0 0 5 3" xmlns="http://www.w3.org/2000/svg">
						<rect width="5" height="1" y="0" fill="#000" />
						<rect width="5" height="1" y="1" fill="#DD0000" />
						<rect width="5" height="1" y="2" fill="#FFCE00" />
					</svg>
				</div>
				<h2>MSFS in Deutschland</h2>
				<p>Als gemeinnütziger Verein dienen wir der deutschsprachigen Gemeinschaft durch
					Gebet, Mission und soziales Engagement &ndash; in Treue zur franzisalianischen Spiritualität. Unsere
					Väter kommen aus verschiedenen MSFS-Provinzen Indiens.</p>
			</div>

			{/* STATS */}
			<div className="stats-band fade-in">
				<div className="stat-item">
					<div className="number">1838</div>
					<div className="label">Gründungsjahr</div>
				</div>
				<div className="stat-item">
					<div className="number">31</div>
					<div className="label">Länder weltweit</div>
				</div>
				<div className="stat-item">
					<div className="number">1601</div>
					<div className="label">Profess-Mitglieder</div>
				</div>
				<div className="stat-item">
					<div className="number">11</div>
					<div className="label">Provinzen weltweit</div>
				</div>
			</div>

			{/* HISTORY */}
			<section id="history">
				<div className="container">
					<span className="section-label">Geschichte</span>
					<h2 className="section-title">Geschichte der MSFS-Kongregation</h2>
					<div className="section-divider"></div>
					<div className="history-text">
						<h3>Gr&#252;ndung der MSFS-Kongregation</h3>
						<p>Der Kontext der Gr&#252;ndung der Kongregation war die Franz&#246;sische Revolution, das Aufkommen
							des Jansenismus und die Auswanderung von Christen aus Savoyen. Die politischen Unruhen
							hinterlie&#223;en die Menschen in einer tiefen geistlichen Krise und gleichg&#252;ltig
							gegen&#252;ber ihren religi&#246;sen Pflichten. P. Peter Mermier &#252;bernahm die Aufgabe der
							geistlichen Erneuerung seines Volkes durch die Predigt von Pfarrmissionen.</p>
						<div className="history-highlight">&#8222;Die Religion kann in Savoyen nur durch die Missionen wieder
							aufleben.&#8220; &mdash; Monsieur Favre an die Missionare in Annecy</div>
						<p>Die MSFS-Kongregation wurde in einem historisch kritischen Moment gegr&#252;ndet, um den dreifachen
							Herausforderungen der Entchristlichung, dem negativen Einfluss des Jansenismus sowie der
							Auswanderung der verarmten Bev&#246;lkerung zu begegnen. P. Mermier war &#252;berzeugt, dass die
							&#8222;Predigt von Pfarrmissionen&#8220; die beste L&#246;sung sei, um Menschen zum Glauben
							zur&#252;ckzubringen. Pfarrmissionen bestanden aus w&#246;chentlichen Exerzitienpredigt und
							Familienbesuchen zur geistlichen Erneuerung der Pfarrei.</p>
						<p>Die Kongregation wurde gegr&#252;ndet als Antwort auf den tiefen Wunsch des Heiligen Franz von Sales,
							eine Gesellschaft von Missionspriestern zu gr&#252;nden. Msgr. Joseph Rey brachte das Thema
							gegen&#252;ber P. Peter Mermier zur Sprache, der denselben Gedanken hegte. Im Jahr 1830 wurde das
							Institut mit La Feuillette als Mutterhaus gegr&#252;ndet.</p>
						<p>Am 29. September 1836 gab Bischof Joseph Rey der Gemeinschaft eine vorl&#228;ufige Genehmigung. Am
							24. September 1838 legten sechs Missionare &ndash; Peter Mermier, Jacques Martin, Philippe Gaiddon,
							Joseph Cheminal, Aim&#233; Petitjean und Joseph Lavorel &ndash; das Stabilit&#228;tsgel&#252;bde ab.
							Am 24. Oktober 1838 erteilte Bischof Rey der Kongregation die kanonische Genehmigung &ndash; damit
							war sie die erste Kongregation, die den Namen des Heiligen Franz von Sales trug. Die Genehmigung des
							Heiligen Stuhls wurde am 22. Juni 1843 erteilt und die endg&#252;ltige Genehmigung am 19. M&#228;rz
							1860.</p>
						<h3>MSFS-Mission in Indien</h3>
						<p>Im Jahr 1845 machte sich die erste Gruppe der Missionare des Heiligen Franz von Sales auf den Weg
							nach Indien und landete am 8. September 1845 in Pondicherry. Sie reisten weiter nach Visakhapatnam,
							wo sie am 19. Februar 1846 ankamen. Am 2. Mai 1848 &#252;bergab die Kongregation f&#252;r die
							Evangelisierung der V&#246;lker das Vikariat Visakhapatnam an die MSFS. Bis 1850 wuchs die
							Visakhapatnam-Mission zu einem vollwertigen Apostolischen Vikariat heran, das sich von Yanam bis
							Visakhapatnam und Cuttack an der Ostk&#252;ste bis Kamptee, Amravati und Jabalpur im Norden
							erstreckte.</p>
						<p>W&#224;hrend der ersten 50 Jahre kamen 62 Priester, 17 Br&#252;der, 15 Seminaristen, 140 Schwestern
							der St. Joseph von Annecy (SJA), 25 Schwestern des Kreuzes von Chavanod (SCC) und 14 Katechistinnen
							(SMMI) zur Arbeit im Vikariat. Im Jahr 1886 wurde das Vikariat Visakhapatnam in zwei Di&#246;zesen
							aufgeteilt: Visakhapatnam und Nagpur.</p>
						<h3>MSFS weltweit</h3>
						<p>Die MSFS in Indien arbeitet in sieben Provinzen: Visakhapatnam, Nagpur, Pune, S&#252;dwestindien,
							S&#252;dostindien, Guwahati und Dibrugarh. Die Visakhapatnam-Provinz (gegr&#252;ndet 1965) ist die
							&#8222;Mutterprovinz&#8220; der MSFS in Indien. Stand 2024 ist die MSFS auf f&#252;nf Kontinenten,
							in 31 L&#228;ndern, 11 Provinzen mit insgesamt 1233 Priestern und 368 Profess-Mitgliedern vertreten.
							Das MSFS-Hauptquartier befindet sich in Rom, Italien.</p>
					</div>
				</div>
			</section>

			{/* MISSION */}
			<section id="mission">
				<div className="container">
					<span className="section-label">Unsere Berufung</span>
					<h2 className="section-title">Mission &amp; Apostolat</h2>
					<div className="section-divider"></div>
					<p style={{ color: '#b0c4e0', maxWidth: '650px', lineHeight: '1.8', fontSize: '15px' }}>Im Geiste des Heiligen Franz von
						Sales setzen wir uns ein f&#252;r Evangelisierung, Bildung, soziale Gerechtigkeit und die F&#246;rderung
						des geistlichen Lebens.</p>
					<div className="mission-cards">
						<div className="mission-card fade-in"><span className="mission-icon">&#10011;</span>
							<h3>Seelsorge &amp; Evangelisierung</h3>
							<p>Wir verk&#252;nden das Evangelium mit Sanftmut. Pfarreiarbeit, Exerzitien und geistliche
								Begleitung stehen im Mittelpunkt.</p>
						</div>
						<div className="mission-card fade-in"><span className="mission-icon">&#128218;</span>
							<h3>Bildung &amp; Formation</h3>
							<p>Wir unterst&#252;tzen Schulen, Seminare und Ausbildungsprogramme f&#252;r benachteiligte
								Jugendliche weltweit.</p>
						</div>
						<div className="mission-card fade-in"><span className="mission-icon">&#129309;</span>
							<h3>Soziales Engagement</h3>
							<p>Wir helfen den Armen durch konkrete Hilfsprojekte, Nothilfe und nachhaltige
								Entwicklungsinitiativen.</p>
						</div>
						<div className="mission-card fade-in"><span className="mission-icon">&#128058;</span>
							<h3>Franzisalianische Spiritualit&#228;t</h3>
							<p>Die Spiritualit&#228;t des Hl. Franz von Sales &ndash; gepr&#228;gt von Sanftmut (Douceur)
								&ndash; leitet unser Gebet t&#228;glich.</p>
						</div>
						<div className="mission-card fade-in"><span className="mission-icon">&#127758;</span>
							<h3>Weltmission</h3>
							<p>Von Indien &#252;ber Afrika bis nach Deutschland: Die MSFS bringt die Botschaft der Liebe in alle
								Kulturen.</p>
						</div>
						<div className="mission-card fade-in"><span className="mission-icon">&#128106;</span>
							<h3>Jugend &amp; Familie</h3>
							<p>Fransalianische Jugend und Familienpastoral sind wichtige S&#228;ulen unseres Dienstes.</p>
						</div>
					</div>
				</div>
			</section>

			{/* PROVINCES & DIOCESES */}
			<section id="provinces">
				<div className="container">
					<span className="section-label">Wirken in Deutschland</span>
					<h2 className="section-title">Di&#246;zesen &amp; MSFS-Provinzen</h2>
					<div className="section-divider"></div>
					<p style={{ color: '#555', fontSize: '15px', lineHeight: '1.7', marginBottom: '30px', maxWidth: '740px' }}>Die Missionare des
						Hl. Franz von Sales sind in zahlreichen deutschen Di&#246;zesen t&#228;tig. Sie kommen aus verschiedenen
						MSFS-Provinzen Indiens und bringen ihre Erfahrungen aus den Weltmissionen in die deutschsprachige Kirche
						ein.</p>
					<div className="provinces-grid">
						<div className="province-box fade-in">
							<h3>&#127465;&#127466; Deutsche Di&#246;zesen, in denen MSFS t&#228;tig ist</h3>
							<ul className="diocese-list">
								<li>Augsburg</li>
								<li>Bamberg</li>
								<li>Eichst&#228;tt</li>
								<li>Erzbistum Bamberg</li>
								<li>Fulda</li>
								<li>Hildesheim</li>
								<li>M&#252;nchen und Frei&#223;ing</li>
								<li>M&#252;nster</li>
								<li>Osnabr&#252;ck</li>
								<li>Passau</li>
								<li>Regensburg</li>
								<li>Rottenburg-Stuttgart</li>
								<li>Trier</li>
								<li>Salzburg</li>
								<li>W&#252;rzburg</li>
							</ul>
						</div>
						<div className="province-box fade-in">
							<h3>&#127758; MSFS-Provinzen, aus denen unsere V&#228;ter kommen</h3>
							<ul className="province-list">
								<li>Dibrugarh</li>
								<li>East Africa</li>
								<li>Guwahati</li>
								<li>Nagpur</li>
								<li>Pune</li>
								<li>South East India</li>
								<li>South West India</li>
								<li>Visakhapatnam</li>
							</ul>
							<div
								style={{ marginTop: '18px', padding: '14px', background: 'var(--white)', borderRadius: '4px', borderLeft: '4px solid var(--gold)' }}>
								<p style={{ fontSize: '13px', color: '#555', lineHeight: '1.6' }}>Die Visakhapatnam-Provinz (gegr&#252;ndet
									1965) ist die &#8222;Mutterprovinz&#8220; der MSFS in Indien. Die weltweite MSFS-Familie
									umfasst heute 11 Provinzen auf 5 Kontinenten in 31 L&#228;ndern.</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* PROJECTS */}
			<section id="projects">
				<div className="container">
					<span className="section-label">Unser Wirken</span>
					<h2 className="section-title">Projekte &amp; Initiativen</h2>
					<div className="section-divider"></div>
					<div className="projects-grid">
						<div className="project-card fade-in">
							<div className="project-thumb thumb-blue"><span style={{ zIndex: 1, position: 'relative' }}>&#127891;</span>
							</div>
							<div className="project-body"><span className="project-tag">Bildung</span>
								<h3>Schulprojekte in Missionsgebieten</h3>
								<p>Unterst&#252;tzung von Schulen und Bildungseinrichtungen in Indien, Afrika und anderen
									Missionsgebieten.</p>
							</div>
						</div>
						<div className="project-card fade-in">
							<div className="project-thumb thumb-gold"><span style={{ zIndex: 1, position: 'relative' }}>&#9962;</span>
							</div>
							<div className="project-body"><span className="project-tag">Pastoral</span>
								<h3>Gemeindeseelsorge in Deutschland</h3>
								<p>Aktive Mitarbeit in deutschen Pfarreien in mehreren Di&#246;zesen &ndash; Gottesdienste,
									Sakramente, geistliche Begleitung.</p>
							</div>
						</div>
						<div className="project-card fade-in">
							<div className="project-thumb thumb-green"><span style={{ zIndex: 1, position: 'relative' }}>&#128167;</span>
							</div>
							<div className="project-body"><span className="project-tag">Nothilfe</span>
								<h3>Humanit&#228;re Hilfsprojekte</h3>
								<p>Sammlung von Spenden f&#252;r Nothilfe in Katastrophengebieten und langfristige
									Entwicklungsprojekte.</p>
							</div>
						</div>
						<div className="project-card fade-in">
							<div className="project-thumb" style={{ background: 'linear-gradient(135deg,#4a1a6b,#7b2fa6)' }}><span
								style={{ zIndex: 1, position: 'relative' }}>&#128214;</span></div>
							<div className="project-body"><span className="project-tag">Spiritualit&#228;t</span>
								<h3>Exerzitien &amp; Besinnungstage</h3>
								<p>Einkehrtage, Exerzitien und spirituelle Kurse im Geiste des Heiligen Franz von Sales.</p>
							</div>
						</div>
						<div className="project-card fade-in">
							<div className="project-thumb" style={{ background: 'linear-gradient(135deg,#1a5260,#2e86ab)' }}><span
								style={{ zIndex: 1, position: 'relative' }}>&#127807;</span></div>
							<div className="project-body"><span className="project-tag">Nachwuchs</span>
								<h3>Berufungspastoral &amp; Seminarf&#246;rderung</h3>
								<p>Unterst&#252;tzung junger M&#228;nner auf dem Weg zum Ordensleben &ndash; F&#246;rderung von
									Seminaristen weltweit.</p>
							</div>
						</div>
						<div className="project-card fade-in">
							<div className="project-thumb" style={{ background: 'linear-gradient(135deg,#5c2c0e,#a0522d)' }}><span
								style={{ zIndex: 1, position: 'relative' }}>&#129306;</span></div>
							<div className="project-body"><span className="project-tag">Gemeinn&#252;tzig</span>
								<h3>Spendenaktionen &amp; Fundraising</h3>
								<p>Als eingetragener gemeinn&#252;tziger Verein (e.V.) erm&#246;glichen wir Spenden mit
									Spendenquittung.</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* GALLERY */}
			<section id="gallery">
				<div className="container">
					<span className="section-label">Bilder</span>
					<h2 className="section-title">Galerie</h2>
					<div className="section-divider center"></div>
					<div className="gallery-ph-grid">
						<div className="gallery-ph-item"><span>&#128247;</span><span>Foto folgt</span></div>
						<div className="gallery-ph-item"><span>&#128444;</span><span>Foto folgt</span></div>
						<div className="gallery-ph-item"><span>&#128248;</span><span>Foto folgt</span></div>
						<div className="gallery-ph-item"><span>&#9962;</span><span>Foto folgt</span></div>
						<div className="gallery-ph-item"><span>&#127758;</span><span>Foto folgt</span></div>
						<div className="gallery-ph-item"><span>&#10011;</span><span>Foto folgt</span></div>
					</div>
					<p className="gallery-note">Fotos werden in K&#252;rze hinzugef&#252;gt &bull; Photos coming soon &bull; Foto in
						arrivo</p>
				</div>
			</section>

			{/* OUR FATHERS */}
			<section id="ourfathers">
				<div className="container">
					<span className="section-label">Unsere geistlichen V&#228;ter</span>
					<h2 className="section-title" style={{ textAlign: 'center' }}>Unsere V&#228;ter</h2>
					<div className="section-divider center"></div>

					<p className="row-label">Patron &bull; Gr&#252;nder &bull; Patronin</p>
					<div className="fathers-grid" style={{ marginBottom: '44px' }}>
						<div className="father-card fade-in">
							<img src="assets/francis.png" alt="Hl. Franz von Sales" className="father-img" />
							<h3>Hl. Franz von Sales</h3>
							<span className="role">Patron &amp; Namenspatron</span>
							<p>Bischof von Genf und Doktor der Kirche (1567&ndash;1622). Sein Wahlspruch: &#8222;Tue alles durch
								Liebe.&#8220; Er steht f&#252;r milde Seelsorge und den Weg der Sanftmut zu Gott.</p>
						</div>
						<div className="father-card fade-in">
							<img src="assets/peter.png" alt="Fr. Peter Marie Mermier" className="father-img"
								style={{ objectPosition: 'top' }} />
							<h3>Fr. Peter Marie Mermier</h3>
							<span className="role">Gr&#252;nder der MSFS (Diener Gottes)</span>
							<p>Gr&#252;ndete 1838 die MSFS in Annecy, Frankreich. Sein Leben war gepr&#228;gt von Missionsgeist,
								Demut und unerm&#252;dlicher N&#228;chstenliebe. Das Seligsprechungsverfahren l&#228;uft.</p>
						</div>
						<div className="father-card fade-in">
							<img src="assets/mariya.png" alt="Maria, Mutter der Schmerzen" className="father-img" />
							<h3>Maria, Mutter der Schmerzen</h3>
							<span className="role">Patronin der Kongregation</span>
							<p>Maria, die Mutter der Schmerzen (Mater Dolorosa), ist die Patronin der MSFS. Sie begleitet die
								Missionare auf ihrem Weg und st&#228;rkt sie in Schwierigkeiten des apostolischen Lebens.</p>
						</div>
					</div>

					<p className="row-label">Leitung &amp; F&#252;hrung</p>
					<div className="fathers-grid fathers-row2">
						<div className="father-card fade-in">
							<img src="assets/fr_johns.png" alt="Superior General" className="father-img"
								style={{ height: '155px', width: '120px' }} />
							<h3>Rev. Fr. Johnson Michael Kallidukil MSFS</h3>
							<span className="role">Superior General &bull; MSFS</span>
							<p>Oberster Leiter der weltweiten MSFS-Kongregation. Sein Amt umfasst die Leitung aller 11 Provinzen
								und die geistliche F&#252;hrung der gesamten Ordensgemeinschaft mit Sitz in Rom.</p>
						</div>
						<div className="father-card fade-in">
							<img src="assets/fr_jomon.png" alt="Fr. Dr. Jomon Emmanuel MSFS" className="father-img"
								style={{ height: '155px', width: '120px', objectPosition: 'top' }} />
							<h3>Fr. Dr. Jomon Emmanuel MSFS</h3>
							<span className="role">1. Vorsitzender des Verbands &bull; Deutschland</span>
							<p>Vorsitzender der Kongregation der Missionare des Hl. Franz von Sales (MSFS) e.V. in Deutschland.
								Verantwortlich f&#252;r die Leitung und Koordination der MSFS-Aktivit&#228;ten in Deutschland.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* CONTACT */}
			<section id="contact">
				<div className="container">
					<span className="section-label">Schreiben Sie uns</span>
					<h2 className="section-title">Kontakt</h2>
					<div className="section-divider"></div>
					<div className="contact-grid">
						<div className="contact-info fade-in">
							<h3>So erreichen Sie uns</h3>
							<div className="contact-detail">
								<div className="contact-icon">📍</div>
								<div className="contact-detail-text">
									<strong>Adresse</strong>
									<p>Kongregation der Missionare des Hl. Franz von Sales (MSFS) e.V.<br />Bergstrasse 4<br />87466
										Oy-Mittelberg, Deutschland</p>
								</div>
							</div>
							<div className="contact-detail">
								<div className="contact-icon">✉️</div>
								<div className="contact-detail-text"><strong>E-Mail</strong><a
									href="mailto:gamsfs2025@gmail.com">gamsfs2025@gmail.com</a></div>
							</div>
							<div className="contact-detail">
								<div className="contact-icon">&#128222;</div>
								<div className="contact-detail-text"><strong>Telefon</strong><a href="tel:+4915129052589">+49 151
									29052589</a></div>
							</div>
							<div className="contact-detail">
								<div className="contact-icon">&#127758;</div>
								<div className="contact-detail-text"><strong>Weltweite MSFS</strong><a href="https://msfs.org"
									target="_blank">www.msfs.org</a></div>
							</div>
							<iframe className="map-embed" loading="lazy"
								src="https://www.openstreetmap.org/export/embed.html?bbox=10.4076,47.6891,10.4276,47.6991&layer=mapnik&marker=47.6941,10.4176"
								style={{ border: 'none' }}>
							</iframe>
						</div>
						<div className="contact-form fade-in">
							<h3>Nachricht senden</h3>
							<div className="form-group"><label>Name</label><input type="text"
								placeholder="Ihr vollst&#228;ndiger Name" /></div>
							<div className="form-group"><label>E-Mail</label><input type="email" placeholder="ihre@email.de" /></div>
							<div className="form-group"><label>Betreff</label><input type="text" placeholder="Worum geht es?" /></div>
							<div className="form-group"><label>Nachricht</label><textarea
								placeholder="Ihre Nachricht an uns..."></textarea></div>
							<button className="btn-submit" onClick={sendMessage}>Nachricht senden &#9992;</button>
							<div id="form-msg" style={{ marginTop: '12px', fontSize: '13px', color: '#2d7a52', display: 'none' }}>&#10003;
								Vielen Dank! Wir melden uns in K&#252;rze.</div>
						</div>
					</div>
				</div>
			</section>

			{/* FOOTER */}
			<footer className="footer-landing">
				<div className="footer-grid">
					<div className="footer-brand">
						<img src="assets/logo.png" alt="MSFS Logo" />
						<p>Kongregation der Missionare des Hl. Franz von Sales (MSFS) e.V.<br />Eingetragener gemeinn&#252;tziger
							Verein in Deutschland</p>
						<div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
							<div style={{ height: '4px', flex: 1, background: '#000', borderRadius: '2px' }}></div>
							<div style={{ height: '4px', flex: 1, background: '#DD0000', borderRadius: '2px' }}></div>
							<div style={{ height: '4px', flex: 1, background: '#FFCE00', borderRadius: '2px' }}></div>
						</div>
					</div>
					<div className="footer-col">
						<h4>Navigation</h4>
						<ul>
							<li><a href="#home">Home</a></li>
							<li><a href="#about">&#220;ber Uns</a></li>
							<li><a href="#history">Geschichte</a></li>
							<li><a href="#mission">Mission</a></li>
							<li><a href="#provinces">Provinzen</a></li>
							<li><a href="#projects">Projekte</a></li>
							<li><a href="#gallery">Galerie</a></li>
							<li><a href="#ourfathers">Unsere V&#228;ter</a></li>
							<li><a href="#contact">Kontakt</a></li>
						</ul>
					</div>
					<div className="footer-col">
						<h4>Links</h4>
						<ul>
							<li><a href="https://msfs.org" target="_blank">MSFS International</a></li>
							<li><a href="https://msfs.org/our-founder/" target="_blank">Gr&#252;nder</a></li>
							<li><a href="https://msfs.org/our-patrons/" target="_blank">Patron</a></li>
							<li><a href="https://msfs.org/provincials/" target="_blank">Provinziale</a></li>
							<li><a href="/login-priest" target="_blank">Priest Login</a></li>
							<li><a href="/login-admin" target="_blank">Admin Login</a></li>
						</ul>
					</div>
					<div className="footer-col">
						<h4>Kontakt</h4>
						<ul>
							<li><a href="mailto:gamsfs2025@gmail.com">gamsfs2025@gmail.com</a></li>
							<li><a href="tel:+4915129052589">+49 151 29052589</a></li>
							<li style={{ color: '#7e6b00', fontSize: '12px', lineHeight: '1.6' }}>Bergstrasse 4<br />87466
								Oy-Mittelberg<br />Deutschland</li>
						</ul>
					</div>
				</div>
				<div className="footer-bottom">
					<p>&copy; 2025 Kongregation der Missionare des Hl. Franz von Sales (MSFS) e.V. &bull; Deutschland &bull;
						Alle Rechte vorbehalten</p>
					<p style={{ marginTop: '5px' }}>&#8222;Tue alles durch Liebe und nichts durch Zwang.&#8220; &mdash; Hl. Franz von
						Sales</p>
				</div>
			</footer>
		</>
	);
};

export default Landing;
