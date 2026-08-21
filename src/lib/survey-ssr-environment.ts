import { settings, type ISurveyEnvironment } from "survey-core";

/**
 * survey-react-ui's dropdown/tagbox `renderFilterInput` destructures
 * `settings.environment.root` without guarding for SSR. Import this module
 * before `survey-react-ui` so the stub is applied to the same survey-core
 * instance the renderer uses.
 */
if (settings.environment == null) {
  const stubElement = {} as HTMLElement;
  settings.environment = {
    root: {} as Document,
    rootElement: stubElement,
    popupMountContainer: stubElement,
    svgMountContainer: stubElement,
    stylesSheetsMountContainer: stubElement,
  } satisfies ISurveyEnvironment;
}
