import { render } from 'solid-js/web';
import 'virtual:uno.css';
import '../theme.css';
import './styles.css';
import App from './components/App';

render(() => <App />, document.getElementById('root')!);
