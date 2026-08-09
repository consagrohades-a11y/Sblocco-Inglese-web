import React from 'react';
import { ChartNoAxesCombined, MapPinned, MessagesSquare, Target } from 'lucide-react';

const pillars = [
  {
    key: 'objective',
    title: <>Partiamo<br />dal tuo obiettivo</>,
    text: <>Definiamo insieme<br />cosa vuoi riuscire<br />a fare e in quali<br />situazioni.</>,
    icon: Target,
  },
  {
    key: 'path',
    title: <>Costruiamo<br />il percorso</>,
    text: <>Solo ciò che ti serve,<br />nel giusto ordine,<br />al tuo ritmo.</>,
    icon: MapPinned,
  },
  {
    key: 'practice',
    title: <>Ti alleni<br />davvero</>,
    text: <>Esercitazioni mirate,<br />feedback e pratica<br />guidata su casi reali.</>,
    icon: MessagesSquare,
  },
  {
    key: 'results',
    title: <>Vedi risultati<br />che restano</>,
    text: <>Più sicurezza, più<br />fluidità, più opportunità<br />nella vita reale.</>,
    icon: ChartNoAxesCombined,
  },
];

export default function HomeMethod() {
  return (
    <section className="home-method" aria-labelledby="home-method-title">
      <div className="home-method__scenery" aria-hidden="true">
        <span className="home-method__arch" />
        <span className="home-method__stairs" />
        <span className="home-method__plant" />
        <span className="home-method__mountains" />
        <span className="home-method__flag" />
      </div>
      <div className="home-shell home-method__grid">
        <div className="home-method__intro">
          <h2 id="home-method-title" className="home-display">Un metodo pratico,<br />fatto per funzionare.</h2>
          <p>
            Niente infinite regole da memorizzare.<br />
            Impari l&apos;inglese nel modo più naturale:<br />
            capendo, usando, sbagliando e riprovando.<br />
            Sempre nel contesto giusto per te.
          </p>
        </div>
        <div className="home-method__pillars">
          {pillars.map(({ key, title, text, icon: Icon }) => (
            <article key={key} className="home-method__pillar">
              <span className="home-method__icon"><Icon aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
