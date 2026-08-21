'use client'

import '@/lib/survey-ssr-environment'
import { useEffect, useMemo } from 'react'
import { Model, type Question } from 'survey-core'
import { Survey } from 'survey-react-ui'

// Base V3 CSS first, then exactly one shadcn adapter, then the app's own
// overrides last so they win by source order.
import 'survey-core/survey-core.css'
import 'survey-core/themes/adapters/shadcn-base-nova.css'
import '@/styles/survey-overrides-shadcn.css'
import '@/styles/survey-overrides-base-nova.css'

import { json } from '../../data/medical_form_json.js'
import { sample } from '../../data/medical_form_sample.js'

const PREFILL_LABEL = 'Prefill demo data';

export default function SurveyComponent() {
  const model = useMemo(() => new Model(json), []);

  // "Prefill demo data" fills the answers on the CURRENT page only, through the
  // public `addNavigationItem` API — host-level use of the model, not a renderer
  // override, so the adapter stays CSS-only.
  useEffect(() => {
    const id = 'sv-prefill-demo';
    model.addNavigationItem({
      id,
      title: PREFILL_LABEL,
      action: () => {
        const names = new Set(
          model.currentPage.questions.map((q: Question) => q.getValueName()),
        );
        const pageData = Object.fromEntries(
          Object.entries(sample).filter(([key]) => names.has(key)),
        );
        model.mergeData(pageData);
      },
    });
    return () => {
      model.navigationBar.removeActionById(id);
    };
  }, [model]);

  return (
    <div className="border overflow-hidden">
      <Survey model={model}/>
    </div>
  );
}
