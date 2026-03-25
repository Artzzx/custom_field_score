"use strict";
/**
 * Fake implementation of @forge/react.
 *
 * Provides stub components and utilities so frontend code that imports
 * from @forge/react can be loaded and tested in a Jest/jsdom environment
 * without the real Forge runtime.
 *
 * Components are simple React pass-through elements that render their children.
 * ForgeReconciler.render() is a no-op that records what was rendered.
 * xcss() returns its input for test assertions.
 *
 * Usage:
 *   In jest.config.cjs moduleNameMapper:
 *     '^@forge/react$': '<rootDir>/.testing-framework/dist/shims/forge-react/index.js'
 *
 *   Then in tests, @forge/react imports resolve to these stubs automatically.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Select = exports.TextArea = exports.Textfield = exports.RequiredAsterisk = exports.ValidMessage = exports.ErrorMessage = exports.HelperMessage = exports.Label = exports.FormFooter = exports.FormSection = exports.FormHeader = exports.Form = exports.ListItem = exports.List = exports.AdfRenderer = exports.Frame = exports.Tile = exports.UserGroup = exports.User = exports.Icon = exports.Image = exports.DynamicTable = exports.EmptyState = exports.Tooltip = exports.TagGroup = exports.Tag = exports.ProgressTracker = exports.ProgressBar = exports.Spinner = exports.SectionMessageAction = exports.SectionMessage = exports.Lozenge = exports.Badge = exports.Strong = exports.Strike = exports.Em = exports.Comment = exports.CodeBlock = exports.Code = exports.Heading = exports.Text = exports.LoadingButton = exports.LinkButton = exports.Link = exports.ButtonGroup = exports.Button = exports.Pressable = exports.Inline = exports.Stack = exports.Box = void 0;
exports.useForm = exports.useTranslation = exports.useIssueProperty = exports.useSpaceProperty = exports.useContentProperty = exports.useConfig = exports.useProductContext = exports.I18nProvider = exports.FilePicker = exports.FileCard = exports.ChromelessEditor = exports.CommentEditor = exports.Calendar = exports.StackBarChart = exports.PieChart = exports.LineChart = exports.HorizontalStackBarChart = exports.HorizontalBarChart = exports.DonutChart = exports.BarChart = exports.Popup = exports.ModalTransition = exports.ModalTitle = exports.ModalHeader = exports.ModalFooter = exports.ModalBody = exports.Modal = exports.TabPanel = exports.TabList = exports.Tab = exports.Tabs = exports.InlineEdit = exports.UserPicker = exports.TimePicker = exports.DatePicker = exports.Range = exports.Toggle = exports.RadioGroup = exports.Radio = exports.CheckboxGroup = exports.Checkbox = void 0;
exports.xcss = xcss;
exports.replaceUnsupportedDocumentNodes = replaceUnsupportedDocumentNodes;
exports.resetForgeReactShim = resetForgeReactShim;
const react_1 = __importDefault(require("react"));
// --- Component factory ---
/**
 * Creates a stub React component that renders its children inside a div
 * with a data-testid attribute for easy querying in tests.
 */
function createStubComponent(displayName) {
    const Component = ({ children, ...rest }) => react_1.default.createElement('div', { 'data-testid': `forge-${displayName.toLowerCase()}`, ...rest }, children);
    Component.displayName = displayName;
    return Component;
}
/**
 * Creates a stub component that renders nothing (for leaf components like Spinner, Range, etc.).
 */
function createLeafComponent(displayName) {
    const Component = (props) => react_1.default.createElement('div', { 'data-testid': `forge-${displayName.toLowerCase()}` });
    Component.displayName = displayName;
    return Component;
}
// --- Primitives / Layout ---
exports.Box = createStubComponent('Box');
exports.Stack = createStubComponent('Stack');
exports.Inline = createStubComponent('Inline');
exports.Pressable = createStubComponent('Pressable');
// --- Action ---
exports.Button = createStubComponent('Button');
exports.ButtonGroup = createStubComponent('ButtonGroup');
exports.Link = createStubComponent('Link');
exports.LinkButton = createStubComponent('LinkButton');
exports.LoadingButton = createStubComponent('LoadingButton');
// --- Typography / Content ---
exports.Text = createStubComponent('Text');
exports.Heading = createStubComponent('Heading');
exports.Code = createStubComponent('Code');
exports.CodeBlock = createStubComponent('CodeBlock');
exports.Comment = createStubComponent('Comment');
exports.Em = createStubComponent('Em');
exports.Strike = createStubComponent('Strike');
exports.Strong = createStubComponent('Strong');
// --- Feedback ---
exports.Badge = createStubComponent('Badge');
exports.Lozenge = createStubComponent('Lozenge');
exports.SectionMessage = createStubComponent('SectionMessage');
exports.SectionMessageAction = createStubComponent('SectionMessageAction');
exports.Spinner = createLeafComponent('Spinner');
exports.ProgressBar = createLeafComponent('ProgressBar');
exports.ProgressTracker = createStubComponent('ProgressTracker');
exports.Tag = createStubComponent('Tag');
exports.TagGroup = createStubComponent('TagGroup');
exports.Tooltip = createStubComponent('Tooltip');
exports.EmptyState = createStubComponent('EmptyState');
// --- Data Display ---
exports.DynamicTable = createStubComponent('DynamicTable');
exports.Image = createLeafComponent('Image');
exports.Icon = createLeafComponent('Icon');
exports.User = createLeafComponent('User');
exports.UserGroup = createStubComponent('UserGroup');
exports.Tile = createStubComponent('Tile');
exports.Frame = createStubComponent('Frame');
exports.AdfRenderer = createStubComponent('AdfRenderer');
exports.List = createStubComponent('List');
exports.ListItem = createStubComponent('ListItem');
// --- Form ---
exports.Form = createStubComponent('Form');
exports.FormHeader = createStubComponent('FormHeader');
exports.FormSection = createStubComponent('FormSection');
exports.FormFooter = createStubComponent('FormFooter');
exports.Label = createStubComponent('Label');
exports.HelperMessage = createStubComponent('HelperMessage');
exports.ErrorMessage = createStubComponent('ErrorMessage');
exports.ValidMessage = createStubComponent('ValidMessage');
exports.RequiredAsterisk = createLeafComponent('RequiredAsterisk');
exports.Textfield = createLeafComponent('Textfield');
exports.TextArea = createLeafComponent('TextArea');
exports.Select = createLeafComponent('Select');
exports.Checkbox = createLeafComponent('Checkbox');
exports.CheckboxGroup = createStubComponent('CheckboxGroup');
exports.Radio = createLeafComponent('Radio');
exports.RadioGroup = createLeafComponent('RadioGroup');
exports.Toggle = createLeafComponent('Toggle');
exports.Range = createLeafComponent('Range');
exports.DatePicker = createLeafComponent('DatePicker');
exports.TimePicker = createLeafComponent('TimePicker');
exports.UserPicker = createLeafComponent('UserPicker');
exports.InlineEdit = createStubComponent('InlineEdit');
// --- Navigation ---
exports.Tabs = createStubComponent('Tabs');
exports.Tab = createStubComponent('Tab');
exports.TabList = createStubComponent('TabList');
exports.TabPanel = createStubComponent('TabPanel');
// --- Overlay ---
exports.Modal = createStubComponent('Modal');
exports.ModalBody = createStubComponent('ModalBody');
exports.ModalFooter = createStubComponent('ModalFooter');
exports.ModalHeader = createStubComponent('ModalHeader');
exports.ModalTitle = createStubComponent('ModalTitle');
exports.ModalTransition = createStubComponent('ModalTransition');
exports.Popup = createStubComponent('Popup');
// --- Charts ---
exports.BarChart = createLeafComponent('BarChart');
exports.DonutChart = createLeafComponent('DonutChart');
exports.HorizontalBarChart = createLeafComponent('HorizontalBarChart');
exports.HorizontalStackBarChart = createLeafComponent('HorizontalStackBarChart');
exports.LineChart = createLeafComponent('LineChart');
exports.PieChart = createLeafComponent('PieChart');
exports.StackBarChart = createLeafComponent('StackBarChart');
// --- Calendar ---
exports.Calendar = createLeafComponent('Calendar');
// --- Comment Editor ---
exports.CommentEditor = createStubComponent('CommentEditor');
exports.ChromelessEditor = createStubComponent('ChromelessEditor');
// --- File components (EAP) ---
exports.FileCard = createLeafComponent('FileCard');
exports.FilePicker = createLeafComponent('FilePicker');
// --- i18n ---
exports.I18nProvider = createStubComponent('I18nProvider');
// --- Hooks ---
const useProductContext = () => undefined;
exports.useProductContext = useProductContext;
const useConfig = () => undefined;
exports.useConfig = useConfig;
function createPropertyHook(name) {
    return (propertyKey, initValue) => [
        initValue,
        async () => { },
        async () => { },
    ];
}
exports.useContentProperty = createPropertyHook('useContentProperty');
exports.useSpaceProperty = createPropertyHook('useSpaceProperty');
exports.useIssueProperty = createPropertyHook('useIssueProperty');
const useTranslation = () => ({
    ready: true,
    t: (key) => key,
    locale: 'en',
});
exports.useTranslation = useTranslation;
const useForm = () => ({
    getFieldId: (name) => `field-${name}`,
    register: (name) => ({ name, id: `field-${name}` }),
    handleSubmit: (fn) => (e) => fn({}),
});
exports.useForm = useForm;
// --- xcss ---
/**
 * Returns its input unchanged — allows test code to assert on style objects.
 */
function xcss(styles) {
    return styles;
}
// --- Utilities ---
/**
 * Stub for replaceUnsupportedDocumentNodes — returns the document unchanged.
 * In the real implementation this walks an ADF doc and replaces unsupported nodes.
 */
function replaceUnsupportedDocumentNodes(document, replaceUnsupportedNode) {
    return document;
}
// --- ForgeReconciler ---
let _lastRendered = null;
let _lastConfig = null;
/**
 * Fake ForgeReconciler. Captures what was rendered for assertions.
 */
const ForgeReconciler = {
    render(element) {
        _lastRendered = element;
    },
    /**
     * Register a config panel element (used for Confluence macro config).
     */
    addConfig(element) {
        _lastConfig = element;
    },
    /**
     * Get the last element passed to ForgeReconciler.render().
     * Useful for test assertions.
     */
    getRendered() {
        return _lastRendered;
    },
    /**
     * Get the last element passed to ForgeReconciler.addConfig().
     * Useful for test assertions.
     */
    getConfig() {
        return _lastConfig;
    },
    /**
     * Reset the recorded render and config (call between tests).
     */
    resetRendered() {
        _lastRendered = null;
        _lastConfig = null;
    },
};
exports.default = ForgeReconciler;
// --- Reset function for test isolation ---
function resetForgeReactShim() {
    ForgeReconciler.resetRendered();
}
