import { exerciseImg, exerciseDescription } from '../lib/data'
import { CloseIcon } from './Icons'

// Нижняя шторка с техникой упражнения — как (i) в плеере Bend
export default function InfoSheet({ exercise, onClose }) {
  if (!exercise) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-label={exercise.name}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="icon-btn sheet__close" onClick={onClose} aria-label="Закрыть">
          <CloseIcon />
        </button>
        <img className="sheet__img" src={exerciseImg(exercise.image)} alt="" />
        <h2 className="sheet__title">{exercise.name}</h2>
        <p className="sheet__sub">{exercise.name_en}</p>
        <p className="sheet__desc">{exerciseDescription(exercise)}</p>
      </div>
    </div>
  )
}
