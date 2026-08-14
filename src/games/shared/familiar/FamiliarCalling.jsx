import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FAMILIAR_SPECIES } from "./familiarCatalog";
import {
  FAMILIAR_CALLING_QUESTIONS,
  createCallingFamiliar,
  resolveFamiliarCalling,
} from "./familiarCalling";
import "./familiar-calling.css";

const INTRO_STEP = -1;

function FamiliarPortrait({ species, selected = false }) {
  const familiar = FAMILIAR_SPECIES[species];
  return (
    <span className={`familiar-calling__portrait${selected ? " is-selected" : ""}`} aria-hidden="true">
      <img src={familiar.asset} alt="" draggable="false" />
    </span>
  );
}

export default function FamiliarCalling({ familiar, onChoose, onClose }) {
  const [step, setStep] = useState(INTRO_STEP);
  const [answers, setAnswers] = useState({});
  const [selectedSpecies, setSelectedSpecies] = useState("");
  const isResult = step >= FAMILIAR_CALLING_QUESTIONS.length;
  const question = step >= 0 && !isResult ? FAMILIAR_CALLING_QUESTIONS[step] : null;
  const recommendations = useMemo(() => resolveFamiliarCalling(answers), [answers]);

  const begin = () => setStep(0);
  const restart = () => {
    setAnswers({});
    setSelectedSpecies("");
    setStep(0);
  };
  const answer = (optionId) => {
    setAnswers((current) => ({ ...current, [question.id]: optionId }));
  };
  const continueCalling = () => {
    if (!question || !answers[question.id]) return;
    if (step === FAMILIAR_CALLING_QUESTIONS.length - 1) {
      const results = resolveFamiliarCalling(answers);
      setSelectedSpecies(results[0].species);
    }
    setStep((current) => current + 1);
  };
  const choose = () => onChoose(createCallingFamiliar(familiar, selectedSpecies));

  if (step === INTRO_STEP) {
    return (
      <section className="familiar-calling" aria-labelledby="familiar-calling-title">
        <div className="familiar-calling__intro-mark" aria-hidden="true"><Sparkles /></div>
        <p className="familiar-calling__eyebrow">The Priory listening room</p>
        <h2 id="familiar-calling-title">Familiar Calling</h2>
        <p className="familiar-calling__lede">
          Five small choices will reveal the companions nearest to your spirit. A calling is a suggestion, never a command.
        </p>
        <div className="familiar-calling__intro-lineup" aria-hidden="true">
          {Object.keys(FAMILIAR_SPECIES).map((species) => <FamiliarPortrait key={species} species={species} />)}
        </div>
        <div className="familiar-calling__actions">
          <Button type="button" variant="outline" className="min-h-11" onClick={onClose}>Return to Wardrobe</Button>
          <Button type="button" className="min-h-11" onClick={begin}><Sparkles aria-hidden="true" /> Begin the calling</Button>
        </div>
      </section>
    );
  }

  if (isResult) {
    const recommendedSpecies = new Set(recommendations.map((result) => result.species));
    return (
      <section className="familiar-calling" aria-labelledby="familiar-calling-result" aria-live="polite">
        <p className="familiar-calling__eyebrow">Your affinities answered</p>
        <h2 id="familiar-calling-result">Three companions drew near</h2>
        <div className="familiar-calling__recommendations">
          {recommendations.map((result, index) => {
            const species = FAMILIAR_SPECIES[result.species];
            const selected = selectedSpecies === result.species;
            return (
              <button
                key={result.affinity}
                type="button"
                className="familiar-calling__recommendation"
                aria-pressed={selected}
                onClick={() => setSelectedSpecies(result.species)}
              >
                <span className="familiar-calling__rank">{index === 0 ? "Closest calling" : result.label}</span>
                <FamiliarPortrait species={result.species} selected={selected} />
                <strong>{species.label}</strong>
                <span>{result.description}</span>
                {selected ? <Check className="familiar-calling__check" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        <div className="familiar-calling__all">
          <h3>Every familiar may still choose you</h3>
          <div className="familiar-calling__all-grid" role="group" aria-label="All familiar choices">
            {Object.entries(FAMILIAR_SPECIES).map(([speciesKey, species]) => {
              const selected = selectedSpecies === speciesKey;
              return (
                <button
                  key={speciesKey}
                  type="button"
                  className="familiar-calling__species-choice"
                  data-recommended={recommendedSpecies.has(speciesKey) ? "true" : "false"}
                  aria-pressed={selected}
                  onClick={() => setSelectedSpecies(speciesKey)}
                >
                  <FamiliarPortrait species={speciesKey} selected={selected} />
                  <span>{species.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="familiar-calling__actions">
          <Button type="button" variant="outline" className="min-h-11" onClick={restart}><RotateCcw aria-hidden="true" /> Answer again</Button>
          <Button type="button" className="min-h-11" disabled={!selectedSpecies} onClick={choose}>
            Continue with {selectedSpecies ? FAMILIAR_SPECIES[selectedSpecies].label : "your familiar"}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </section>
    );
  }

  const selectedAnswer = answers[question.id] || "";
  return (
    <section className="familiar-calling" aria-labelledby={`calling-question-${question.id}`}>
      <div className="familiar-calling__progress-row">
        <span>Question {step + 1} of {FAMILIAR_CALLING_QUESTIONS.length}</span>
        <span>{Math.round(((step + 1) / FAMILIAR_CALLING_QUESTIONS.length) * 100)}%</span>
      </div>
      <div className="familiar-calling__progress" aria-hidden="true">
        <span style={{ width: `${((step + 1) / FAMILIAR_CALLING_QUESTIONS.length) * 100}%` }} />
      </div>
      <p className="familiar-calling__eyebrow">The listening lantern brightens</p>
      <h2 id={`calling-question-${question.id}`}>{question.prompt}</h2>
      <div className="familiar-calling__options" role="radiogroup" aria-label={question.prompt}>
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="familiar-calling__option"
            role="radio"
            aria-checked={selectedAnswer === option.id}
            onClick={() => answer(option.id)}
          >
            <span className="familiar-calling__option-mark" aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        ))}
      </div>
      <div className="familiar-calling__actions">
        <Button type="button" variant="outline" className="min-h-11" onClick={() => setStep((current) => current - 1)}>
          <ArrowLeft aria-hidden="true" /> {step === 0 ? "Opening" : "Previous"}
        </Button>
        <Button type="button" className="min-h-11" disabled={!selectedAnswer} onClick={continueCalling}>
          {step === FAMILIAR_CALLING_QUESTIONS.length - 1 ? "Reveal companions" : "Continue"}
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
