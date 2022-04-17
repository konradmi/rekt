import Rect from './Rect'

const ElementC = (
  <div id='elementC'>
    element C
  </div>
)

const ElementA = (
  <div id='elementA'>
    element A
  </div>
)

const ElementB = (
  <div id='elementB'>
    element B
    <ElementC/>
  </div>
)
/** @jsx Rect.createElement */
const element = (
  <div id="foo">
    <ElementA/>
    <ElementB/>
  </div>
)

const container = document.getElementById('root')
Rect.render(element, container)
