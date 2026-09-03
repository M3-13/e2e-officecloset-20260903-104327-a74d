import "./LegalPages.css";

export default function ImpressumPage() {
  return (
    <section className="page">
      <article className="legal">
        <h1>Impressum</h1>
        <p className="legal__intro">
          Angaben gemäß § 5 TMG (Telemediengesetz)
        </p>

        <h2>Anbieter</h2>
        <p>
          Red Carpet Wardrobe
          <br />
          Max Mustermann
          <br />
          Musterstraße 1
          <br />
          12345 Musterstadt
          <br />
          Deutschland
        </p>

        <h2>Kontakt</h2>
        <p>
          E-Mail: kontakt@redcarpetwardrobe.example
          <br />
          Telefon: +49 123 456789
        </p>

        <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p>
          Max Mustermann
          <br />
          Musterstraße 1
          <br />
          12345 Musterstadt
          <br />
          Deutschland
        </p>

        <h2>Haftung für Inhalte</h2>
        <p>
          Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach
          den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir
          als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder
          gespeicherte fremde Informationen zu überwachen oder nach Umständen zu
          forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen
          zur Entfernung oder Sperrung der Nutzung von Informationen nach den
          allgemeinen Gesetzen bleiben hiervon unberührt.
        </p>

        <h2>Haftung für Links</h2>
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren
          Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden
          Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten
          Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten
          verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der
          Verlinkung auf mögliche Rechtsverstöße überprüft; rechtswidrige Inhalte
          waren zum Zeitpunkt der Verlinkung nicht erkennbar.
        </p>

        <h2>Urheberrecht</h2>
        <p>
          Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen
          Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung,
          Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
          Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des
          jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite
          sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
        </p>

        <p className="legal__note">
          Dies ist ein Mustertext. Die genannten Angaben (Name, Anschrift und
          Kontaktdaten) sind Beispieldaten und vor der Veröffentlichung durch die
          tatsächlichen Angaben des Betreibers zu ersetzen.
        </p>
      </article>
    </section>
  );
}
