import displays from 'helpers/displays';
import forEach from 'lodash.foreach';
import getElementProps from 'helpers/get-element-props';
import stylesManager from 'helpers/styles-manager';
import utils from 'helpers/utils';
import Component from 'components/component';
import Droppable from 'components/dnd/droppable';
import Symbol from 'elements/symbol';
import React, {PropTypes} from 'react';
import {Component as Jss} from 'relax-jss';

import classes from './canvas.less';
import Empty from './empty';

export default class Canvas extends Component {
  static propTypes = {
    pageBuilderActions: PropTypes.object.isRequired,
    display: PropTypes.string.isRequired,
    styles: PropTypes.array.isRequired,
    symbols: PropTypes.object.isRequired,
    dragging: PropTypes.bool.isRequired,
    pageData: PropTypes.object.isRequired,
    templateData: PropTypes.object,
    elements: PropTypes.object.isRequired,
    selectedId: PropTypes.string,
    editing: PropTypes.bool.isRequired
  };

  static contextTypes = {
    store: PropTypes.object.isRequired
  };

  static childContextTypes = {
    dropHighlight: PropTypes.string.isRequired
  };

  getInitState () {
    this.renderElementBind = ::this.renderElement;
    this.renderChildrenBind = ::this.renderChildren;
    return {};
  }

  getChildContext () {
    const {dragging} = this.props;
    return {
      dropHighlight: dragging ? 'vertical' : 'none'
    };
  }

  componentDidMount () {
    this.refs.canvas.addEventListener('scroll', this.onScroll.bind(this));
  }

  onScroll () {
    window.dispatchEvent(new Event('scroll'));
  }

  render () {
    const {display, templateData} = this.props;
    const dropInfo = {
      id: 'body',
      type: 'body'
    };
    const bodyStyle = {
      margin: '0 auto',
      maxWidth: displays[display]
    };

    const content = templateData ? this.renderTemplate() : this.renderContent();

    return (
      <div className={classes.canvas} ref='canvas'>
        <div className={classes.content} style={bodyStyle} ref='body'>
          <Droppable
            type='body'
            placeholder
            placeholderRender={::this.renderPlaceholder}
            dropInfo={dropInfo}
            accepts='Section'
            minHeight='100%'
          >
            {content}
          </Droppable>
        </div>
        {this.renderStyles()}
      </div>
    );
  }

  renderTemplate () {
    const {templateData} = this.props;
    const content = this.renderContent();

    return templateData.body && this.renderChildren(templateData.body.children, {
      customData: templateData,
      editing: false,
      injectChildren: {
        id: templateData.content,
        content
      }
    });
  }

  renderContent () {
    const {pageData} = this.props;
    const elementsLinks = {};
    return pageData && pageData.body && this.renderChildren(pageData.body.children, {
      elementsLinks
    });
  }

  renderPlaceholder () {
    const {pageBuilderActions} = this.props;
    return (
      <Empty pageBuilderActions={pageBuilderActions} />
    );
  }

  renderStyles () {
    const styleTags = [];
    forEach(stylesManager.stylesMap, (styleMap, key) => {
      styleTags.push(
        <Jss stylesheet={styleMap.stylesheet} key={key} />
      );
    });
    return styleTags;
  }

  renderChildren (children, options) {
    let result;
    if (children instanceof Array) {
      result = children.map(this.renderElement.bind(this, options));
    } else {
      result = children;
    }
    return result;
  }

  renderElement (options, elementId, positionInParent) {
    const {display, editing, pageData, elements, selectedId, styles} = this.props;
    let element = options.customData && options.customData[elementId] || pageData[elementId];

    const elementProps = getElementProps(element, display);

    if (options.schemaEntry && options.elementsLinks && options.elementsLinks[element.id]) {
      element = utils.alterSchemaElementProps(
        options.elementsLinks[element.id],
        element,
        options.schemaEntry,
        elementProps
      );
    }

    const styleClassMap = stylesManager.processElement(
      element,
      elementProps,
      elements[element.tag],
      styles,
      elements,
      display
    );

    if ((!element.hide || !element.hide[display]) && element.display !== false) {
      const FactoredElement = element.tag === 'Symbol' ? Symbol : elements[element.tag];
      const selected = selectedId === element.id;
      let children;

      if (element.tag !== 'Symbol') {
        if (options.injectChildren && options.injectChildren.id === element.id) {
          console.log('HERE');
          children = options.injectChildren.content;
        } else if (element.children) {
          children = this.renderChildren(element.children, options);
        }
      }

      return (
        <FactoredElement
          {...elementProps}
          styleClassMap={styleClassMap || {}}
          key={elementId}
          relax={{
            editing: typeof options.editing !== 'undefined' ? options.editing : editing,
            display,
            selected,
            element,
            positionInParent,
            renderElement: this.renderElementBind,
            renderChildren: this.renderChildrenBind,
            insideSymbol: options.customData && true,
            dispatch: this.context.store.dispatch
          }}
        >
          {children}
        </FactoredElement>
      );
    }
  }
}
