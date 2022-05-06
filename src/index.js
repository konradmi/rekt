import Didact from './Didact'

/** @jsx Didact.createElement */
function Counter () {
  const [state1, setState1] = Didact.useState(1)
  const [state2, setState2] = Didact.useState(2)
  return (
      <div>
        <h1 onClick={() => console.log('increase counter') || setState1(c => c + 1)} style="user-select: none">
            Count: {state1}
        </h1>
          <h1 onClick={() => console.log('increase counter') || setState2(c => c + 1)} style="user-select: none">
              Count: {state2}
          </h1>
      </div>
  )
}
const element = <Counter />
const container = document.getElementById('root')
Didact.render(element, container) // element is basically the entire application transformed by babel
