import "./LegalPages.css";

export default function DatenschutzPage() {
  return (
    <section className="page">
      <article className="legal">
        <h1>Datenschutzerklärung</h1>
        <p className="legal__intro">
          Informationen über die Verarbeitung Ihrer personenbezogenen Daten
        </p>

        <h2>Verantwortliche Stelle</h2>
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
          <br />
          E-Mail: kontakt@redcarpetwardrobe.example
        </p>

        <h2>Welche Daten gespeichert werden</h2>
        <p>
          Im Rahmen der Nutzung dieser Anwendung werden ausschließlich die Daten
          gespeichert, die für den Betrieb des Dienstes erforderlich sind:
        </p>
        <ul>
          <li>
            Ihre Zugangsdaten: E-Mail-Adresse sowie Ihr Passwort in
            verschlüsselter (gehashter) Form,
          </li>
          <li>
            Ihre Garderobe: Kleidungsstücke mit Name, Beschreibung, Farbe und
            den von Ihnen hochgeladenen Bildern,
          </li>
          <li>Ihre selbst angelegten Kategorien,</li>
          <li>
            Ihre gespeicherten Outfits samt der darin enthaltenen
            Kleidungsstücke.
          </li>
        </ul>
        <p>
          Die Daten werden ausschließlich zu dem Zweck verarbeitet, Ihnen die
          Nutzung der Anwendung zu ermöglichen. Eine Weitergabe an Dritte findet
          nicht statt.
        </p>

        <h2>Keine Drittanbieter-Ressourcen</h2>
        <p>
          Diese Anwendung lädt keine Ressourcen von Drittanbietern — insbesondere
          keine externen Schriftarten, Skripte, Analyse- oder Werbedienste. Alle
          Inhalte werden von unseren eigenen Servern ausgeliefert, sodass beim
          Besuch dieser Seiten keine Daten an Dritte übertragen werden. Eine
          Einwilligung zum Laden von Drittanbieter-Ressourcen ist daher nicht
          erforderlich.
        </p>

        <h2>Speicherdauer</h2>
        <p>
          Ihre Daten werden so lange gespeichert, wie Ihr Benutzerkonto besteht
          und Sie die Anwendung nutzen. Sobald Sie Ihr Konto löschen, werden alle
          zugehörigen Daten dauerhaft entfernt.
        </p>

        <h2>Löschung Ihrer Daten</h2>
        <p>
          Sie können Ihr Konto jederzeit selbst über die Funktion „Konto löschen“
          in Ihren Kontoeinstellungen entfernen. Dabei werden alle mit Ihrem Konto
          verknüpften Daten vollständig gelöscht — einschließlich Ihrer
          Zugangsdaten, Ihrer Kleidungsstücke, der hochgeladenen Bilder, Ihrer
          Kategorien und Ihrer gespeicherten Outfits.
        </p>

        <h2>Ihre Rechte</h2>
        <p>Ihnen stehen folgende Rechte zu:</p>
        <ul>
          <li>Recht auf Auskunft über die zu Ihrer Person gespeicherten Daten,</li>
          <li>Recht auf Berichtigung unrichtiger Daten,</li>
          <li>Recht auf Löschung Ihrer Daten,</li>
          <li>
            Recht auf Einschränkung der Verarbeitung sowie das Recht, der
            Verarbeitung zu widersprechen,
          </li>
          <li>
            Recht auf Beschwerde bei einer zuständigen Aufsichtsbehörde für den
            Datenschutz.
          </li>
        </ul>

        <h2>Sicherheit</h2>
        <p>
          Wir setzen technische und organisatorische Maßnahmen ein, um Ihre Daten
          gegen Verlust, Missbrauch und unbefugten Zugriff zu schützen.
          Passwörter werden ausschließlich in verschlüsselter Form gespeichert.
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
