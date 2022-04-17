const createTextElement = text => {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  }
}

const createFinalElement = (type, props, children) => {
  const element = {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === 'object'
          ? child
          : createTextElement(child),
      ),
    },
  }

  return element
}

const createElement = (type, props, ...children) => {
  // apparently when babel calls createElement recursively on every node sometimes it passes 3 arguments to the function
  // and sometimes only one
  if (typeof type === 'string') return createFinalElement(type, props, children)

  const { type: elType } = type
  const { children: elChildren, ...elProps } = type.props
  return createFinalElement(elType, elProps, elChildren)
}

const createDom = fiber => {
  const dom =
    fiber.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(fiber.type)

  const isNotChildren = key => key !== 'children'
  Object.keys(fiber.props)
    .filter(isNotChildren)
    .forEach(name => {
      dom[name] = fiber.props[name]
    })

  return dom
}

const performUnitOfWork = fiber => {
  // a fiber corresponds to one element to be rendered
  // Each fiber has a link to its first child, its next sibling and its parent
  //
  // performUnitOfWork should return nextUnitOfWork
  // it returns:
  // - if it has the child => return the child
  // - if it doesn't have the child and has the sibling => return the sibling
  // - if it doesn't have the child or the sibling => return the sibling of the parent
  if (!fiber.dom) fiber.dom = createDom(fiber)
  if (fiber.parent) fiber.parent.dom.appendChild(fiber.dom)

  const { children } = fiber.props
  let index = 0
  let prevSibling = null

  // create fibers for each child
  while (index < children.length) {
    const element = children[index]
    const newFiber = {
      type: element.type,
      props: element.props,
      parent: fiber,
      dom: null,
    }

    if (index === 0) fiber.child = newFiber // set the reference to the first child
    else prevSibling.sibling = newFiber

    prevSibling = newFiber
    index++
  }

  if (fiber.child) return fiber.child
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) return nextFiber.sibling
    nextFiber = nextFiber.parent
  }
}

let nextUnitOfWork = null

const render = (element, container) => {
  nextUnitOfWork = {
    dom: container,
    props: {
      children: [element],
    },
  }
}

const workLoop = deadline => {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }
  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

const Rect = {
  createElement,
  render,
}

export default Rect
