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

const render = (element, container) => {
  const dom =
    element.type === 'TEXT_ELEMENT'
      ? document.createTextNode('')
      : document.createElement(element.type)

  const isProperty = key => key !== 'children'
  Object.keys(element.props)
    .filter(isProperty)
    .forEach(name => {
      dom[name] = element.props[name]
    })

  element.props.children.forEach(child =>
    render(child, dom),
  )

  container.appendChild(dom)
}

const Rect = {
  createElement,
  render,
}

export default Rect
