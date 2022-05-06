const createElement = (type, props, ...children) => {
  console.log('createElement')
  // the important thing is to note that this will get call everytime we render a new JSX into the DOM.
  // it's not invoked only for the first time
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === 'object' ? child : createTextElement(child),
      ),
    },
  }
}

const createTextElement = text => {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    },
  }
}
// it's just creating a DOM node. it's not added to the DOM
const createDom = fiber => {
  const dom =
      fiber.type === 'TEXT_ELEMENT'
        ? document.createTextNode('')
        : document.createElement(fiber.type)

  updateDom(dom, {}, fiber.props)

  return dom
}

const isEvent = key => key.startsWith('on')
const isProperty = key => key !== 'children' && !isEvent(key)
const isNew = (prev, next) => key => prev[key] !== next[key]
const isGone = (prev, next) => key => !(key in next)
function updateDom (dom, prevProps, nextProps) {
  // Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = ''
    })

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name]
    })

  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })
}

const commitRoot = () => {
  console.log('commitRoot', wipRoot)
  deletions.forEach(commitWork)
  commitWork(wipRoot.child)
  currentRoot = wipRoot
  wipRoot = null
}

// this is where we modify the DOM
const commitWork = fiber => {
  if (!fiber) return

  let domParentFiber = fiber.parent
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) domParent.appendChild(fiber.dom)
  else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) updateDom(fiber.dom, fiber.alternate.props, fiber.props)
  else if (fiber.effectTag === 'DELETION') commitDeletion(fiber, domParent)

  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

function commitDeletion (fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    commitDeletion(fiber.child, domParent)
  }
}

function render (element, container) {
  console.log('render')
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    alternate: currentRoot, // reference to what we committed in the previous commit phase
  }
  deletions = []
  nextUnitOfWork = wipRoot
}

let nextUnitOfWork = null
let currentRoot = null
let wipRoot = null // we're gonna keep the entire tree in memory and we're gonna mutate that a lot to keep track of the state
let deletions = null

function workLoop (deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

// a fiber corresponds to one element to be rendered
// Each fiber has a link to its first child, its next sibling and its parent

// performUnitOfWork should return nextUnitOfWork
// it returns:
// - if it has the child => return the child
// - if it doesn't have the child and has the sibling => return the sibling
// - if it doesn't have the child or the sibling => return the sibling of the parent
const performUnitOfWork = fiber => {
  console.log('performUnitOfWork', fiber)
  const isFunctionComponent = fiber.type instanceof Function
  if (isFunctionComponent) {
    updateFunctionComponent(fiber)
  } else {
    updateHostComponent(fiber)
  }
  if (fiber.child) {
    return fiber.child
  }
  let nextFiber = fiber
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    nextFiber = nextFiber.parent
  }
}

let wipFiber = null
let hookIndex = null // it tracks hooks in one function component

function updateFunctionComponent (fiber) { // this one is called in performUnitOfWork => hooks are evaluated at every re-render
  wipFiber = fiber
  // we reset everything so that we have clean state before we execute the function component and then hoooks as a consequence
  hookIndex = 0
  wipFiber.hooks = [] // to be able to call useState many times in a component
  console.log('run function component')
  const children = [fiber.type(fiber.props)] // we run the function component to get the DOM. This is when the hooks are executed
  reconcileChildren(fiber, children)
}

function useState (initial) {
  console.log('useState')
  const oldHook =
      wipFiber.alternate &&
      wipFiber.alternate.hooks &&
      wipFiber.alternate.hooks[hookIndex]
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  }

  const actions = oldHook ? oldHook.queue : []
  console.log('actions', actions)
  actions.forEach(action => {
    hook.state = action(hook.state)
  })

  const setState = action => {
    // after setState is called it will trigger the re-render of the app so, as a result, useState will get executed again
    console.log('setState', action)
    hook.queue.push(action)
    wipRoot = { // it's how we trigger re-renders when the state changes
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }
  console.log('hook', hook)
  wipFiber.hooks.push(hook) // this all happens within one fiber/component. It's to ensure we can have more than one
  // setState hook in the component.
  // We can’t call Hooks inside of conditionals, loops, or nested functions in order to ensure
  // that Hooks are called in the same order each time a component renders.
  hookIndex++
  console.log('useState end')
  return [hook.state, setState]
}

function updateHostComponent (fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber.props.children)
}

function reconcileChildren (wipFiber, elements) {
  let index = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null

  while (index < elements.length || oldFiber != null) {
    const element = elements[index]
    let newFiber = null

    const sameType = oldFiber && element && element.type === oldFiber.type

    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      }
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT',
      }
    }
    if (oldFiber && !sameType) {
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    if (index === 0) {
      wipFiber.child = newFiber
    } else if (element) {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}

export default {
  createElement,
  render,
  useState,
}
